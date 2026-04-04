import { type ClipboardEvent, type CompositionEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactElement, startTransition, useLayoutEffect, useRef, useState } from 'react';

type KeywordInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  errorText?: string;
  keywordCount?: number;
  keywordLimit?: number | null;
  maxLength?: number;
  rows?: number;
};

type SelectionOffsets = {
  start: number;
  end: number;
};

export function KeywordInput({
  value,
  onChange,
  disabled = false,
  errorText,
  keywordCount,
  keywordLimit,
  maxLength = 2000,
  rows = 5,
}: KeywordInputProps): ReactElement {
  // Drafting Value
  const [draftValue, setDraftValue] = useState(value);

  // References
  const editorRef = useRef<HTMLDivElement | null>(null);
  const pendingSelectionRef = useRef<SelectionOffsets | null>(null);
  const isComposingRef = useRef(false);
  const latestValueRef = useRef(value);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    if (isComposingRef.current) {
      return;
    }
    // Always sync editor content to value prop
    latestValueRef.current = value;
    setDraftValue(value);
    syncEditorMarkup(editor, value, null);
    pendingSelectionRef.current = null;
  }, [value]);

  const commitValue = (nextValue: string, selection: SelectionOffsets | null): void => {
    const truncatedValue = nextValue.slice(0, maxLength);
    latestValueRef.current = truncatedValue;
    setDraftValue(truncatedValue);
    pendingSelectionRef.current = selection === null ? null : {
      start: Math.min(selection.start, truncatedValue.length),
      end: Math.min(selection.end, truncatedValue.length),
    };

    syncEditorMarkup(editorRef.current, truncatedValue, pendingSelectionRef.current);
    pendingSelectionRef.current = null;

    // Always call onChange to ensure parent state updates and keyword count is correct
    startTransition(() => {
      onChange(truncatedValue);
    });
  };

  const handleInput = (): void => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const text = readEditableText(editor);
    commitValue(text, getSelectionOffsets(editor));
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>): void => {
    event.preventDefault();

    if (disabled) {
      return;
    }

    insertTextAtSelection(event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n'));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (disabled || isComposingRef.current) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      insertTextAtSelection('\n');
    }
  };

  const handleCompositionStart = (): void => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (_event: CompositionEvent<HTMLDivElement>): void => {
    isComposingRef.current = false;
    handleInput();
  };

  const insertTextAtSelection = (insertedText: string): void => {
    const editor = editorRef.current;
    const selection = editor ? getSelectionOffsets(editor) : null;
    const currentValue = latestValueRef.current;
    const start = selection?.start ?? currentValue.length;
    const end = selection?.end ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${insertedText}${currentValue.slice(end)}`;
    const nextCaret = Math.min(start + insertedText.length, maxLength);

    commitValue(nextValue, { start: nextCaret, end: nextCaret });
  };

  return (
    <label className='form-control w-full'>
      <span className='mb-1 flex items-center justify-between'>
        <span className='label-text'>Keywords</span>
        <span className='text-right text-[11px] leading-tight text-base-content/60'>
          {keywordLimit === null || keywordLimit === undefined ? <span>{draftValue.length}/{maxLength}</span> : (
            <>
              <span className='block'>{keywordCount ?? 0}/{keywordLimit} Keywords ({draftValue.length}/{maxLength})</span>
              <span className='block'></span>
            </>
          )}
        </span>
      </span>
      <div
        ref={editorRef}
        className={`w-full overflow-y-auto whitespace-pre-wrap break-words rounded-box border bg-base-200 px-3 py-3 text-sm leading-6 outline-none transition-colors ${errorText ? 'border-error' : 'border-base-300'} ${disabled ? 'cursor-not-allowed opacity-60' : 'text-base-content'}`}
        style={{ height: `${rows * 1.5 + 1.5}rem` }}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role='textbox'
        aria-multiline='true'
        aria-disabled={disabled}
        aria-invalid={errorText ? 'true' : 'false'}
        spellCheck={false}
        tabIndex={disabled ? -1 : 0}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
      <span className={`mt-1 block min-h-[1rem] w-full text-center text-[11px] ${errorText ? 'text-error' : 'text-base-content/60'}`}>
        {errorText ?? ''}
      </span>
    </label>
  );
}

function syncEditorMarkup(
  editor: HTMLDivElement | null,
  value: string,
  selection: SelectionOffsets | null,
): void {
  if (!editor) {
    return;
  }

  const nextMarkup = buildHighlightedMarkup(value);
  if (editor.innerHTML !== nextMarkup) {
    editor.innerHTML = nextMarkup;
  }

  if (selection !== null && globalThis.document.activeElement === editor) {
    restoreSelection(editor, selection);
  }
}

function buildHighlightedMarkup(value: string): string {
  if (value === '') {
    return '<br data-trailing-break="true">';
  }

  const markup = value
    .split('\n')
    .map((line) => buildHighlightedLine(line))
    .join('<br>');

  return value.endsWith('\n') ? `${markup}<br data-trailing-break="true">` : markup;
}

function buildHighlightedLine(line: string): string {
  let activeClassName: 'text-error' | 'text-success' | null = null;

  return line
    .split(/(\s+)/)
    .map((segment) => {
      if (/^\s+$/.test(segment)) {
        return escapeHtml(segment);
      }

      const escapedSegment = escapeHtml(segment);
      if (segment.startsWith('+')) {
        activeClassName = 'text-success';
      }
      else if (segment.startsWith('-')) {
        activeClassName = 'text-error';
      }

      return activeClassName === null ? escapedSegment : `<span class="${activeClassName}">${escapedSegment}</span>`;
    })
    .join('');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"]/g, (character) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    } as Record<string, string>)[character] ?? character);
}

function readEditableText(editor: HTMLDivElement): string {
  return collectText(editor).replace(/\u00A0/g, ' ');
}

function collectText(node: Node): string {
  if (node.nodeType === globalThis.Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node instanceof globalThis.HTMLBRElement) {
    if (isTrailingBreakNode(node)) {
      return '';
    }
    return '\n';
  }

  return Array.from(node.childNodes).map((child) => collectText(child)).join('');
}

function getSelectionOffsets(container: HTMLElement): SelectionOffsets | null {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }

  return {
    start: getTextOffset(container, range.startContainer, range.startOffset),
    end: getTextOffset(container, range.endContainer, range.endOffset),
  };
}

function getTextOffset(container: HTMLElement, node: Node, offset: number): number {
  const range = globalThis.document.createRange();
  range.setStart(container, 0);
  range.setEnd(node, offset);
  return collectText(range.cloneContents()).length;
}

function restoreSelection(container: HTMLElement, selection: SelectionOffsets): void {
  const browserSelection = globalThis.getSelection();
  if (!browserSelection) {
    return;
  }

  const range = globalThis.document.createRange();
  const startPosition = findTextPosition(container, selection.start);
  const endPosition = findTextPosition(container, selection.end);

  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);

  browserSelection.removeAllRanges();
  browserSelection.addRange(range);
}

function findTextPosition(container: HTMLElement, targetOffset: number): { node: Node; offset: number } {
  const resolvedPosition = findTextPositionInNode(container, targetOffset);
  return resolvedPosition ?? {
    node: container,
    offset: container.childNodes.length,
  };
}

function findTextPositionInNode(node: Node, targetOffset: number): { node: Node; offset: number } | null {
  if (node.nodeType === globalThis.Node.TEXT_NODE) {
    const textLength = node.textContent?.length ?? 0;
    if (targetOffset <= textLength) {
      return {
        node,
        offset: targetOffset,
      };
    }
    return null;
  }

  if (node instanceof globalThis.HTMLBRElement) {
    const parentNode = node.parentNode;
    if (!parentNode) {
      return null;
    }

    const childIndex = Array.from(parentNode.childNodes).indexOf(node);
    const breakLength = isTrailingBreakNode(node) ? 0 : 1;
    if (targetOffset <= 0) {
      return {
        node: parentNode,
        offset: childIndex,
      };
    }
    if (targetOffset === breakLength) {
      return {
        node: parentNode,
        offset: childIndex + 1,
      };
    }
    return null;
  }

  let remainingOffset = targetOffset;
  for (const childNode of Array.from(node.childNodes)) {
    const childLength = collectText(childNode).length;
    if (remainingOffset <= childLength) {
      return findTextPositionInNode(childNode, remainingOffset);
    }
    remainingOffset -= childLength;
  }

  if (node instanceof globalThis.HTMLElement) {
    return {
      node,
      offset: node.childNodes.length,
    };
  }

  return null;
}

function isTrailingBreakNode(node: globalThis.HTMLBRElement): boolean {
  return node.dataset.trailingBreak === 'true';
}
