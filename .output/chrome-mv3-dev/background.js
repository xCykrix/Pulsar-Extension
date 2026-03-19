var background = (function() {
  "use strict";
  const getDefaultsFromPostinstall = () => void 0;
  const stringToByteArray$1 = function(str) {
    const out = [];
    let p = 0;
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) {
        out[p++] = c;
      } else if (c < 2048) {
        out[p++] = c >> 6 | 192;
        out[p++] = c & 63 | 128;
      } else if ((c & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
        c = 65536 + ((c & 1023) << 10) + (str.charCodeAt(++i) & 1023);
        out[p++] = c >> 18 | 240;
        out[p++] = c >> 12 & 63 | 128;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      } else {
        out[p++] = c >> 12 | 224;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      }
    }
    return out;
  };
  const byteArrayToString = function(bytes) {
    const out = [];
    let pos = 0, c = 0;
    while (pos < bytes.length) {
      const c1 = bytes[pos++];
      if (c1 < 128) {
        out[c++] = String.fromCharCode(c1);
      } else if (c1 > 191 && c1 < 224) {
        const c2 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
      } else if (c1 > 239 && c1 < 365) {
        const c2 = bytes[pos++];
        const c3 = bytes[pos++];
        const c4 = bytes[pos++];
        const u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 65536;
        out[c++] = String.fromCharCode(55296 + (u >> 10));
        out[c++] = String.fromCharCode(56320 + (u & 1023));
      } else {
        const c2 = bytes[pos++];
        const c3 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
      }
    }
    return out.join("");
  };
  const base64 = {
    /**
     * Maps bytes to characters.
     */
    byteToCharMap_: null,
    /**
     * Maps characters to bytes.
     */
    charToByteMap_: null,
    /**
     * Maps bytes to websafe characters.
     * @private
     */
    byteToCharMapWebSafe_: null,
    /**
     * Maps websafe characters to bytes.
     * @private
     */
    charToByteMapWebSafe_: null,
    /**
     * Our default alphabet, shared between
     * ENCODED_VALS and ENCODED_VALS_WEBSAFE
     */
    ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    /**
     * Our default alphabet. Value 64 (=) is special; it means "nothing."
     */
    get ENCODED_VALS() {
      return this.ENCODED_VALS_BASE + "+/=";
    },
    /**
     * Our websafe alphabet.
     */
    get ENCODED_VALS_WEBSAFE() {
      return this.ENCODED_VALS_BASE + "-_.";
    },
    /**
     * Whether this browser supports the atob and btoa functions. This extension
     * started at Mozilla but is now implemented by many browsers. We use the
     * ASSUME_* variables to avoid pulling in the full useragent detection library
     * but still allowing the standard per-browser compilations.
     *
     */
    HAS_NATIVE_SUPPORT: typeof atob === "function",
    /**
     * Base64-encode an array of bytes.
     *
     * @param input An array of bytes (numbers with
     *     value in [0, 255]) to encode.
     * @param webSafe Boolean indicating we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeByteArray(input, webSafe) {
      if (!Array.isArray(input)) {
        throw Error("encodeByteArray takes an array as a parameter");
      }
      this.init_();
      const byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
      const output = [];
      for (let i = 0; i < input.length; i += 3) {
        const byte1 = input[i];
        const haveByte2 = i + 1 < input.length;
        const byte2 = haveByte2 ? input[i + 1] : 0;
        const haveByte3 = i + 2 < input.length;
        const byte3 = haveByte3 ? input[i + 2] : 0;
        const outByte1 = byte1 >> 2;
        const outByte2 = (byte1 & 3) << 4 | byte2 >> 4;
        let outByte3 = (byte2 & 15) << 2 | byte3 >> 6;
        let outByte4 = byte3 & 63;
        if (!haveByte3) {
          outByte4 = 64;
          if (!haveByte2) {
            outByte3 = 64;
          }
        }
        output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
      }
      return output.join("");
    },
    /**
     * Base64-encode a string.
     *
     * @param input A string to encode.
     * @param webSafe If true, we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeString(input, webSafe) {
      if (this.HAS_NATIVE_SUPPORT && !webSafe) {
        return btoa(input);
      }
      return this.encodeByteArray(stringToByteArray$1(input), webSafe);
    },
    /**
     * Base64-decode a string.
     *
     * @param input to decode.
     * @param webSafe True if we should use the
     *     alternative alphabet.
     * @return string representing the decoded value.
     */
    decodeString(input, webSafe) {
      if (this.HAS_NATIVE_SUPPORT && !webSafe) {
        return atob(input);
      }
      return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
    },
    /**
     * Base64-decode a string.
     *
     * In base-64 decoding, groups of four characters are converted into three
     * bytes.  If the encoder did not apply padding, the input length may not
     * be a multiple of 4.
     *
     * In this case, the last group will have fewer than 4 characters, and
     * padding will be inferred.  If the group has one or two characters, it decodes
     * to one byte.  If the group has three characters, it decodes to two bytes.
     *
     * @param input Input to decode.
     * @param webSafe True if we should use the web-safe alphabet.
     * @return bytes representing the decoded value.
     */
    decodeStringToByteArray(input, webSafe) {
      this.init_();
      const charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
      const output = [];
      for (let i = 0; i < input.length; ) {
        const byte1 = charToByteMap[input.charAt(i++)];
        const haveByte2 = i < input.length;
        const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
        ++i;
        const haveByte3 = i < input.length;
        const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        const haveByte4 = i < input.length;
        const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
          throw new DecodeBase64StringError();
        }
        const outByte1 = byte1 << 2 | byte2 >> 4;
        output.push(outByte1);
        if (byte3 !== 64) {
          const outByte2 = byte2 << 4 & 240 | byte3 >> 2;
          output.push(outByte2);
          if (byte4 !== 64) {
            const outByte3 = byte3 << 6 & 192 | byte4;
            output.push(outByte3);
          }
        }
      }
      return output;
    },
    /**
     * Lazy static initialization function. Called before
     * accessing any of the static map variables.
     * @private
     */
    init_() {
      if (!this.byteToCharMap_) {
        this.byteToCharMap_ = {};
        this.charToByteMap_ = {};
        this.byteToCharMapWebSafe_ = {};
        this.charToByteMapWebSafe_ = {};
        for (let i = 0; i < this.ENCODED_VALS.length; i++) {
          this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
          this.charToByteMap_[this.byteToCharMap_[i]] = i;
          this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
          this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
          if (i >= this.ENCODED_VALS_BASE.length) {
            this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
            this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
          }
        }
      }
    }
  };
  class DecodeBase64StringError extends Error {
    constructor() {
      super(...arguments);
      this.name = "DecodeBase64StringError";
    }
  }
  const base64Encode = function(str) {
    const utf8Bytes = stringToByteArray$1(str);
    return base64.encodeByteArray(utf8Bytes, true);
  };
  const base64urlEncodeWithoutPadding = function(str) {
    return base64Encode(str).replace(/\./g, "");
  };
  const base64Decode = function(str) {
    try {
      return base64.decodeString(str, true);
    } catch (e) {
      console.error("base64Decode failed: ", e);
    }
    return null;
  };
  function getGlobal() {
    if (typeof self !== "undefined") {
      return self;
    }
    if (typeof window !== "undefined") {
      return window;
    }
    if (typeof global !== "undefined") {
      return global;
    }
    throw new Error("Unable to locate global object.");
  }
  const getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
  const getDefaultsFromEnvVariable = () => {
    if (typeof process === "undefined" || typeof process.env === "undefined") {
      return;
    }
    const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
    if (defaultsJsonString) {
      return JSON.parse(defaultsJsonString);
    }
  };
  const getDefaultsFromCookie = () => {
    if (typeof document === "undefined") {
      return;
    }
    let match;
    try {
      match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
    } catch (e) {
      return;
    }
    const decoded = match && base64Decode(match[1]);
    return decoded && JSON.parse(decoded);
  };
  const getDefaults = () => {
    try {
      return getDefaultsFromPostinstall() || getDefaultsFromGlobal() || getDefaultsFromEnvVariable() || getDefaultsFromCookie();
    } catch (e) {
      console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
      return;
    }
  };
  const getDefaultAppConfig = () => getDefaults()?.config;
  class Deferred {
    constructor() {
      this.reject = () => {
      };
      this.resolve = () => {
      };
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
    /**
     * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     */
    wrapCallback(callback) {
      return (error, value) => {
        if (error) {
          this.reject(error);
        } else {
          this.resolve(value);
        }
        if (typeof callback === "function") {
          this.promise.catch(() => {
          });
          if (callback.length === 1) {
            callback(error);
          } else {
            callback(error, value);
          }
        }
      };
    }
  }
  function isIndexedDBAvailable() {
    try {
      return typeof indexedDB === "object";
    } catch (e) {
      return false;
    }
  }
  function validateIndexedDBOpenable() {
    return new Promise((resolve, reject) => {
      try {
        let preExist = true;
        const DB_CHECK_NAME = "validate-browser-context-for-indexeddb-analytics-module";
        const request = self.indexedDB.open(DB_CHECK_NAME);
        request.onsuccess = () => {
          request.result.close();
          if (!preExist) {
            self.indexedDB.deleteDatabase(DB_CHECK_NAME);
          }
          resolve(true);
        };
        request.onupgradeneeded = () => {
          preExist = false;
        };
        request.onerror = () => {
          reject(request.error?.message || "");
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  const ERROR_NAME = "FirebaseError";
  class FirebaseError extends Error {
    constructor(code, message, customData) {
      super(message);
      this.code = code;
      this.customData = customData;
      this.name = ERROR_NAME;
      Object.setPrototypeOf(this, FirebaseError.prototype);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ErrorFactory.prototype.create);
      }
    }
  }
  class ErrorFactory {
    constructor(service, serviceName, errors) {
      this.service = service;
      this.serviceName = serviceName;
      this.errors = errors;
    }
    create(code, ...data) {
      const customData = data[0] || {};
      const fullCode = `${this.service}/${code}`;
      const template = this.errors[code];
      const message = template ? replaceTemplate(template, customData) : "Error";
      const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
      const error = new FirebaseError(fullCode, fullMessage, customData);
      return error;
    }
  }
  function replaceTemplate(template, data) {
    return template.replace(PATTERN, (_, key) => {
      const value = data[key];
      return value != null ? String(value) : `<${key}?>`;
    });
  }
  const PATTERN = /\{\$([^}]+)}/g;
  function deepEqual(a, b) {
    if (a === b) {
      return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    for (const k of aKeys) {
      if (!bKeys.includes(k)) {
        return false;
      }
      const aProp = a[k];
      const bProp = b[k];
      if (isObject(aProp) && isObject(bProp)) {
        if (!deepEqual(aProp, bProp)) {
          return false;
        }
      } else if (aProp !== bProp) {
        return false;
      }
    }
    for (const k of bKeys) {
      if (!aKeys.includes(k)) {
        return false;
      }
    }
    return true;
  }
  function isObject(thing) {
    return thing !== null && typeof thing === "object";
  }
  function getModularInstance(service) {
    if (service && service._delegate) {
      return service._delegate;
    } else {
      return service;
    }
  }
  class Component {
    /**
     *
     * @param name The public service name, e.g. app, auth, firestore, database
     * @param instanceFactory Service factory responsible for creating the public interface
     * @param type whether the service provided by the component is public or private
     */
    constructor(name2, instanceFactory, type) {
      this.name = name2;
      this.instanceFactory = instanceFactory;
      this.type = type;
      this.multipleInstances = false;
      this.serviceProps = {};
      this.instantiationMode = "LAZY";
      this.onInstanceCreated = null;
    }
    setInstantiationMode(mode) {
      this.instantiationMode = mode;
      return this;
    }
    setMultipleInstances(multipleInstances) {
      this.multipleInstances = multipleInstances;
      return this;
    }
    setServiceProps(props) {
      this.serviceProps = props;
      return this;
    }
    setInstanceCreatedCallback(callback) {
      this.onInstanceCreated = callback;
      return this;
    }
  }
  const DEFAULT_ENTRY_NAME$1 = "[DEFAULT]";
  class Provider {
    constructor(name2, container) {
      this.name = name2;
      this.container = container;
      this.component = null;
      this.instances = /* @__PURE__ */ new Map();
      this.instancesDeferred = /* @__PURE__ */ new Map();
      this.instancesOptions = /* @__PURE__ */ new Map();
      this.onInitCallbacks = /* @__PURE__ */ new Map();
    }
    /**
     * @param identifier A provider can provide multiple instances of a service
     * if this.component.multipleInstances is true.
     */
    get(identifier) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
      if (!this.instancesDeferred.has(normalizedIdentifier)) {
        const deferred = new Deferred();
        this.instancesDeferred.set(normalizedIdentifier, deferred);
        if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
          try {
            const instance = this.getOrInitializeService({
              instanceIdentifier: normalizedIdentifier
            });
            if (instance) {
              deferred.resolve(instance);
            }
          } catch (e) {
          }
        }
      }
      return this.instancesDeferred.get(normalizedIdentifier).promise;
    }
    getImmediate(options) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(options?.identifier);
      const optional = options?.optional ?? false;
      if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
        try {
          return this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
        } catch (e) {
          if (optional) {
            return null;
          } else {
            throw e;
          }
        }
      } else {
        if (optional) {
          return null;
        } else {
          throw Error(`Service ${this.name} is not available`);
        }
      }
    }
    getComponent() {
      return this.component;
    }
    setComponent(component) {
      if (component.name !== this.name) {
        throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
      }
      if (this.component) {
        throw Error(`Component for ${this.name} has already been provided`);
      }
      this.component = component;
      if (!this.shouldAutoInitialize()) {
        return;
      }
      if (isComponentEager(component)) {
        try {
          this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME$1 });
        } catch (e) {
        }
      }
      for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
        const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
        try {
          const instance = this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
          instanceDeferred.resolve(instance);
        } catch (e) {
        }
      }
    }
    clearInstance(identifier = DEFAULT_ENTRY_NAME$1) {
      this.instancesDeferred.delete(identifier);
      this.instancesOptions.delete(identifier);
      this.instances.delete(identifier);
    }
    // app.delete() will call this method on every provider to delete the services
    // TODO: should we mark the provider as deleted?
    async delete() {
      const services = Array.from(this.instances.values());
      await Promise.all([
        ...services.filter((service) => "INTERNAL" in service).map((service) => service.INTERNAL.delete()),
        ...services.filter((service) => "_delete" in service).map((service) => service._delete())
      ]);
    }
    isComponentSet() {
      return this.component != null;
    }
    isInitialized(identifier = DEFAULT_ENTRY_NAME$1) {
      return this.instances.has(identifier);
    }
    getOptions(identifier = DEFAULT_ENTRY_NAME$1) {
      return this.instancesOptions.get(identifier) || {};
    }
    initialize(opts = {}) {
      const { options = {} } = opts;
      const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
      if (this.isInitialized(normalizedIdentifier)) {
        throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
      }
      if (!this.isComponentSet()) {
        throw Error(`Component ${this.name} has not been registered yet`);
      }
      const instance = this.getOrInitializeService({
        instanceIdentifier: normalizedIdentifier,
        options
      });
      for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
        const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
        if (normalizedIdentifier === normalizedDeferredIdentifier) {
          instanceDeferred.resolve(instance);
        }
      }
      return instance;
    }
    /**
     *
     * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
     * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
     *
     * @param identifier An optional instance identifier
     * @returns a function to unregister the callback
     */
    onInit(callback, identifier) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
      const existingCallbacks = this.onInitCallbacks.get(normalizedIdentifier) ?? /* @__PURE__ */ new Set();
      existingCallbacks.add(callback);
      this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
      const existingInstance = this.instances.get(normalizedIdentifier);
      if (existingInstance) {
        callback(existingInstance, normalizedIdentifier);
      }
      return () => {
        existingCallbacks.delete(callback);
      };
    }
    /**
     * Invoke onInit callbacks synchronously
     * @param instance the service instance`
     */
    invokeOnInitCallbacks(instance, identifier) {
      const callbacks = this.onInitCallbacks.get(identifier);
      if (!callbacks) {
        return;
      }
      for (const callback of callbacks) {
        try {
          callback(instance, identifier);
        } catch {
        }
      }
    }
    getOrInitializeService({ instanceIdentifier, options = {} }) {
      let instance = this.instances.get(instanceIdentifier);
      if (!instance && this.component) {
        instance = this.component.instanceFactory(this.container, {
          instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
          options
        });
        this.instances.set(instanceIdentifier, instance);
        this.instancesOptions.set(instanceIdentifier, options);
        this.invokeOnInitCallbacks(instance, instanceIdentifier);
        if (this.component.onInstanceCreated) {
          try {
            this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
          } catch {
          }
        }
      }
      return instance || null;
    }
    normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME$1) {
      if (this.component) {
        return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME$1;
      } else {
        return identifier;
      }
    }
    shouldAutoInitialize() {
      return !!this.component && this.component.instantiationMode !== "EXPLICIT";
    }
  }
  function normalizeIdentifierForFactory(identifier) {
    return identifier === DEFAULT_ENTRY_NAME$1 ? void 0 : identifier;
  }
  function isComponentEager(component) {
    return component.instantiationMode === "EAGER";
  }
  class ComponentContainer {
    constructor(name2) {
      this.name = name2;
      this.providers = /* @__PURE__ */ new Map();
    }
    /**
     *
     * @param component Component being added
     * @param overwrite When a component with the same name has already been registered,
     * if overwrite is true: overwrite the existing component with the new component and create a new
     * provider with the new component. It can be useful in tests where you want to use different mocks
     * for different tests.
     * if overwrite is false: throw an exception
     */
    addComponent(component) {
      const provider = this.getProvider(component.name);
      if (provider.isComponentSet()) {
        throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
      }
      provider.setComponent(component);
    }
    addOrOverwriteComponent(component) {
      const provider = this.getProvider(component.name);
      if (provider.isComponentSet()) {
        this.providers.delete(component.name);
      }
      this.addComponent(component);
    }
    /**
     * getProvider provides a type safe interface where it can only be called with a field name
     * present in NameServiceMapping interface.
     *
     * Firebase SDKs providing services should extend NameServiceMapping interface to register
     * themselves.
     */
    getProvider(name2) {
      if (this.providers.has(name2)) {
        return this.providers.get(name2);
      }
      const provider = new Provider(name2, this);
      this.providers.set(name2, provider);
      return provider;
    }
    getProviders() {
      return Array.from(this.providers.values());
    }
  }
  var LogLevel;
  (function(LogLevel2) {
    LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
    LogLevel2[LogLevel2["VERBOSE"] = 1] = "VERBOSE";
    LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
    LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
    LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
    LogLevel2[LogLevel2["SILENT"] = 5] = "SILENT";
  })(LogLevel || (LogLevel = {}));
  const levelStringToEnum = {
    "debug": LogLevel.DEBUG,
    "verbose": LogLevel.VERBOSE,
    "info": LogLevel.INFO,
    "warn": LogLevel.WARN,
    "error": LogLevel.ERROR,
    "silent": LogLevel.SILENT
  };
  const defaultLogLevel = LogLevel.INFO;
  const ConsoleMethod = {
    [LogLevel.DEBUG]: "log",
    [LogLevel.VERBOSE]: "log",
    [LogLevel.INFO]: "info",
    [LogLevel.WARN]: "warn",
    [LogLevel.ERROR]: "error"
  };
  const defaultLogHandler = (instance, logType, ...args) => {
    if (logType < instance.logLevel) {
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const method = ConsoleMethod[logType];
    if (method) {
      console[method](`[${now}]  ${instance.name}:`, ...args);
    } else {
      throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
    }
  };
  class Logger {
    /**
     * Gives you an instance of a Logger to capture messages according to
     * Firebase's logging scheme.
     *
     * @param name The name that the logs will be associated with
     */
    constructor(name2) {
      this.name = name2;
      this._logLevel = defaultLogLevel;
      this._logHandler = defaultLogHandler;
      this._userLogHandler = null;
    }
    get logLevel() {
      return this._logLevel;
    }
    set logLevel(val) {
      if (!(val in LogLevel)) {
        throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
      }
      this._logLevel = val;
    }
    // Workaround for setter/getter having to be the same type.
    setLogLevel(val) {
      this._logLevel = typeof val === "string" ? levelStringToEnum[val] : val;
    }
    get logHandler() {
      return this._logHandler;
    }
    set logHandler(val) {
      if (typeof val !== "function") {
        throw new TypeError("Value assigned to `logHandler` must be a function");
      }
      this._logHandler = val;
    }
    get userLogHandler() {
      return this._userLogHandler;
    }
    set userLogHandler(val) {
      this._userLogHandler = val;
    }
    /**
     * The functions below are all based on the `console` interface
     */
    debug(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
      this._logHandler(this, LogLevel.DEBUG, ...args);
    }
    log(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.VERBOSE, ...args);
      this._logHandler(this, LogLevel.VERBOSE, ...args);
    }
    info(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
      this._logHandler(this, LogLevel.INFO, ...args);
    }
    warn(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
      this._logHandler(this, LogLevel.WARN, ...args);
    }
    error(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
      this._logHandler(this, LogLevel.ERROR, ...args);
    }
  }
  const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
  let idbProxyableTypes;
  let cursorAdvanceMethods;
  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [
      IDBDatabase,
      IDBObjectStore,
      IDBIndex,
      IDBCursor,
      IDBTransaction
    ]);
  }
  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = [
      IDBCursor.prototype.advance,
      IDBCursor.prototype.continue,
      IDBCursor.prototype.continuePrimaryKey
    ]);
  }
  const cursorRequestMap = /* @__PURE__ */ new WeakMap();
  const transactionDoneMap = /* @__PURE__ */ new WeakMap();
  const transactionStoreNamesMap = /* @__PURE__ */ new WeakMap();
  const transformCache = /* @__PURE__ */ new WeakMap();
  const reverseTransformCache = /* @__PURE__ */ new WeakMap();
  function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        request.removeEventListener("success", success);
        request.removeEventListener("error", error);
      };
      const success = () => {
        resolve(wrap(request.result));
        unlisten();
      };
      const error = () => {
        reject(request.error);
        unlisten();
      };
      request.addEventListener("success", success);
      request.addEventListener("error", error);
    });
    promise.then((value) => {
      if (value instanceof IDBCursor) {
        cursorRequestMap.set(value, request);
      }
    }).catch(() => {
    });
    reverseTransformCache.set(promise, request);
    return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
    if (transactionDoneMap.has(tx))
      return;
    const done = new Promise((resolve, reject) => {
      const unlisten = () => {
        tx.removeEventListener("complete", complete);
        tx.removeEventListener("error", error);
        tx.removeEventListener("abort", error);
      };
      const complete = () => {
        resolve();
        unlisten();
      };
      const error = () => {
        reject(tx.error || new DOMException("AbortError", "AbortError"));
        unlisten();
      };
      tx.addEventListener("complete", complete);
      tx.addEventListener("error", error);
      tx.addEventListener("abort", error);
    });
    transactionDoneMap.set(tx, done);
  }
  let idbProxyTraps = {
    get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        if (prop === "done")
          return transactionDoneMap.get(target);
        if (prop === "objectStoreNames") {
          return target.objectStoreNames || transactionStoreNamesMap.get(target);
        }
        if (prop === "store") {
          return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      }
      return wrap(target[prop]);
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has(target, prop) {
      if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
        return true;
      }
      return prop in target;
    }
  };
  function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
    if (func === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype)) {
      return function(storeNames, ...args) {
        const tx = func.call(unwrap(this), storeNames, ...args);
        transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
        return wrap(tx);
      };
    }
    if (getCursorAdvanceMethods().includes(func)) {
      return function(...args) {
        func.apply(unwrap(this), args);
        return wrap(cursorRequestMap.get(this));
      };
    }
    return function(...args) {
      return wrap(func.apply(unwrap(this), args));
    };
  }
  function transformCachableValue(value) {
    if (typeof value === "function")
      return wrapFunction(value);
    if (value instanceof IDBTransaction)
      cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
      return new Proxy(value, idbProxyTraps);
    return value;
  }
  function wrap(value) {
    if (value instanceof IDBRequest)
      return promisifyRequest(value);
    if (transformCache.has(value))
      return transformCache.get(value);
    const newValue = transformCachableValue(value);
    if (newValue !== value) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }
    return newValue;
  }
  const unwrap = (value) => reverseTransformCache.get(value);
  function openDB(name2, version2, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name2, version2);
    const openPromise = wrap(request);
    if (upgrade) {
      request.addEventListener("upgradeneeded", (event) => {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
      });
    }
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event.newVersion,
        event
      ));
    }
    openPromise.then((db) => {
      if (terminated)
        db.addEventListener("close", () => terminated());
      if (blocking) {
        db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
      }
    }).catch(() => {
    });
    return openPromise;
  }
  function deleteDB(name2, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name2);
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event
      ));
    }
    return wrap(request).then(() => void 0);
  }
  const readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
  const writeMethods = ["put", "add", "delete", "clear"];
  const cachedMethods = /* @__PURE__ */ new Map();
  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
      return;
    }
    if (cachedMethods.get(prop))
      return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, "");
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
      // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
      !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
    ) {
      return;
    }
    const method = async function(storeName, ...args) {
      const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
      let target2 = tx.store;
      if (useIndex)
        target2 = target2.index(args.shift());
      return (await Promise.all([
        target2[targetFuncName](...args),
        isWrite && tx.done
      ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
  }));
  class PlatformLoggerServiceImpl {
    constructor(container) {
      this.container = container;
    }
    // In initial implementation, this will be called by installations on
    // auth token refresh, and installations will send this string.
    getPlatformInfoString() {
      const providers = this.container.getProviders();
      return providers.map((provider) => {
        if (isVersionServiceProvider(provider)) {
          const service = provider.getImmediate();
          return `${service.library}/${service.version}`;
        } else {
          return null;
        }
      }).filter((logString) => logString).join(" ");
    }
  }
  function isVersionServiceProvider(provider) {
    const component = provider.getComponent();
    return component?.type === "VERSION";
  }
  const name$q = "@firebase/app";
  const version$1$1 = "0.14.9";
  const logger$1 = new Logger("@firebase/app");
  const name$p = "@firebase/app-compat";
  const name$o = "@firebase/analytics-compat";
  const name$n = "@firebase/analytics";
  const name$m = "@firebase/app-check-compat";
  const name$l = "@firebase/app-check";
  const name$k = "@firebase/auth";
  const name$j = "@firebase/auth-compat";
  const name$i = "@firebase/database";
  const name$h = "@firebase/data-connect";
  const name$g = "@firebase/database-compat";
  const name$f = "@firebase/functions";
  const name$e = "@firebase/functions-compat";
  const name$d = "@firebase/installations";
  const name$c = "@firebase/installations-compat";
  const name$b = "@firebase/messaging";
  const name$a = "@firebase/messaging-compat";
  const name$9 = "@firebase/performance";
  const name$8 = "@firebase/performance-compat";
  const name$7 = "@firebase/remote-config";
  const name$6 = "@firebase/remote-config-compat";
  const name$5 = "@firebase/storage";
  const name$4 = "@firebase/storage-compat";
  const name$3 = "@firebase/firestore";
  const name$2 = "@firebase/ai";
  const name$1$1 = "@firebase/firestore-compat";
  const name$r = "firebase";
  const DEFAULT_ENTRY_NAME = "[DEFAULT]";
  const PLATFORM_LOG_STRING = {
    [name$q]: "fire-core",
    [name$p]: "fire-core-compat",
    [name$n]: "fire-analytics",
    [name$o]: "fire-analytics-compat",
    [name$l]: "fire-app-check",
    [name$m]: "fire-app-check-compat",
    [name$k]: "fire-auth",
    [name$j]: "fire-auth-compat",
    [name$i]: "fire-rtdb",
    [name$h]: "fire-data-connect",
    [name$g]: "fire-rtdb-compat",
    [name$f]: "fire-fn",
    [name$e]: "fire-fn-compat",
    [name$d]: "fire-iid",
    [name$c]: "fire-iid-compat",
    [name$b]: "fire-fcm",
    [name$a]: "fire-fcm-compat",
    [name$9]: "fire-perf",
    [name$8]: "fire-perf-compat",
    [name$7]: "fire-rc",
    [name$6]: "fire-rc-compat",
    [name$5]: "fire-gcs",
    [name$4]: "fire-gcs-compat",
    [name$3]: "fire-fst",
    [name$1$1]: "fire-fst-compat",
    [name$2]: "fire-vertex",
    "fire-js": "fire-js",
    // Platform identifier for JS SDK.
    [name$r]: "fire-js-all"
  };
  const _apps = /* @__PURE__ */ new Map();
  const _serverApps = /* @__PURE__ */ new Map();
  const _components = /* @__PURE__ */ new Map();
  function _addComponent(app, component) {
    try {
      app.container.addComponent(component);
    } catch (e) {
      logger$1.debug(`Component ${component.name} failed to register with FirebaseApp ${app.name}`, e);
    }
  }
  function _registerComponent(component) {
    const componentName = component.name;
    if (_components.has(componentName)) {
      logger$1.debug(`There were multiple attempts to register component ${componentName}.`);
      return false;
    }
    _components.set(componentName, component);
    for (const app of _apps.values()) {
      _addComponent(app, component);
    }
    for (const serverApp of _serverApps.values()) {
      _addComponent(serverApp, component);
    }
    return true;
  }
  function _getProvider(app, name2) {
    const heartbeatController = app.container.getProvider("heartbeat").getImmediate({ optional: true });
    if (heartbeatController) {
      void heartbeatController.triggerHeartbeat();
    }
    return app.container.getProvider(name2);
  }
  const ERRORS = {
    [
      "no-app"
      /* AppError.NO_APP */
    ]: "No Firebase App '{$appName}' has been created - call initializeApp() first",
    [
      "bad-app-name"
      /* AppError.BAD_APP_NAME */
    ]: "Illegal App name: '{$appName}'",
    [
      "duplicate-app"
      /* AppError.DUPLICATE_APP */
    ]: "Firebase App named '{$appName}' already exists with different options or config",
    [
      "app-deleted"
      /* AppError.APP_DELETED */
    ]: "Firebase App named '{$appName}' already deleted",
    [
      "server-app-deleted"
      /* AppError.SERVER_APP_DELETED */
    ]: "Firebase Server App has been deleted",
    [
      "no-options"
      /* AppError.NO_OPTIONS */
    ]: "Need to provide options, when not being deployed to hosting via source.",
    [
      "invalid-app-argument"
      /* AppError.INVALID_APP_ARGUMENT */
    ]: "firebase.{$appName}() takes either no argument or a Firebase App instance.",
    [
      "invalid-log-argument"
      /* AppError.INVALID_LOG_ARGUMENT */
    ]: "First argument to `onLog` must be null or a function.",
    [
      "idb-open"
      /* AppError.IDB_OPEN */
    ]: "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-get"
      /* AppError.IDB_GET */
    ]: "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-set"
      /* AppError.IDB_WRITE */
    ]: "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-delete"
      /* AppError.IDB_DELETE */
    ]: "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "finalization-registry-not-supported"
      /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */
    ]: "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
    [
      "invalid-server-app-environment"
      /* AppError.INVALID_SERVER_APP_ENVIRONMENT */
    ]: "FirebaseServerApp is not for use in browser environments."
  };
  const ERROR_FACTORY$2 = new ErrorFactory("app", "Firebase", ERRORS);
  class FirebaseAppImpl {
    constructor(options, config, container) {
      this._isDeleted = false;
      this._options = { ...options };
      this._config = { ...config };
      this._name = config.name;
      this._automaticDataCollectionEnabled = config.automaticDataCollectionEnabled;
      this._container = container;
      this.container.addComponent(new Component(
        "app",
        () => this,
        "PUBLIC"
        /* ComponentType.PUBLIC */
      ));
    }
    get automaticDataCollectionEnabled() {
      this.checkDestroyed();
      return this._automaticDataCollectionEnabled;
    }
    set automaticDataCollectionEnabled(val) {
      this.checkDestroyed();
      this._automaticDataCollectionEnabled = val;
    }
    get name() {
      this.checkDestroyed();
      return this._name;
    }
    get options() {
      this.checkDestroyed();
      return this._options;
    }
    get config() {
      this.checkDestroyed();
      return this._config;
    }
    get container() {
      return this._container;
    }
    get isDeleted() {
      return this._isDeleted;
    }
    set isDeleted(val) {
      this._isDeleted = val;
    }
    /**
     * This function will throw an Error if the App has already been deleted -
     * use before performing API actions on the App.
     */
    checkDestroyed() {
      if (this.isDeleted) {
        throw ERROR_FACTORY$2.create("app-deleted", { appName: this._name });
      }
    }
  }
  function initializeApp(_options, rawConfig = {}) {
    let options = _options;
    if (typeof rawConfig !== "object") {
      const name3 = rawConfig;
      rawConfig = { name: name3 };
    }
    const config = {
      name: DEFAULT_ENTRY_NAME,
      automaticDataCollectionEnabled: true,
      ...rawConfig
    };
    const name2 = config.name;
    if (typeof name2 !== "string" || !name2) {
      throw ERROR_FACTORY$2.create("bad-app-name", {
        appName: String(name2)
      });
    }
    options || (options = getDefaultAppConfig());
    if (!options) {
      throw ERROR_FACTORY$2.create(
        "no-options"
        /* AppError.NO_OPTIONS */
      );
    }
    const existingApp = _apps.get(name2);
    if (existingApp) {
      if (deepEqual(options, existingApp.options) && deepEqual(config, existingApp.config)) {
        return existingApp;
      } else {
        throw ERROR_FACTORY$2.create("duplicate-app", { appName: name2 });
      }
    }
    const container = new ComponentContainer(name2);
    for (const component of _components.values()) {
      container.addComponent(component);
    }
    const newApp = new FirebaseAppImpl(options, config, container);
    _apps.set(name2, newApp);
    return newApp;
  }
  function getApp(name2 = DEFAULT_ENTRY_NAME) {
    const app = _apps.get(name2);
    if (!app && name2 === DEFAULT_ENTRY_NAME && getDefaultAppConfig()) {
      return initializeApp();
    }
    if (!app) {
      throw ERROR_FACTORY$2.create("no-app", { appName: name2 });
    }
    return app;
  }
  function getApps() {
    return Array.from(_apps.values());
  }
  function registerVersion(libraryKeyOrName, version2, variant) {
    let library = PLATFORM_LOG_STRING[libraryKeyOrName] ?? libraryKeyOrName;
    if (variant) {
      library += `-${variant}`;
    }
    const libraryMismatch = library.match(/\s|\//);
    const versionMismatch = version2.match(/\s|\//);
    if (libraryMismatch || versionMismatch) {
      const warning = [
        `Unable to register library "${library}" with version "${version2}":`
      ];
      if (libraryMismatch) {
        warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
      }
      if (libraryMismatch && versionMismatch) {
        warning.push("and");
      }
      if (versionMismatch) {
        warning.push(`version name "${version2}" contains illegal characters (whitespace or "/")`);
      }
      logger$1.warn(warning.join(" "));
      return;
    }
    _registerComponent(new Component(
      `${library}-version`,
      () => ({ library, version: version2 }),
      "VERSION"
      /* ComponentType.VERSION */
    ));
  }
  const DB_NAME = "firebase-heartbeat-database";
  const DB_VERSION = 1;
  const STORE_NAME = "firebase-heartbeat-store";
  let dbPromise$2 = null;
  function getDbPromise$2() {
    if (!dbPromise$2) {
      dbPromise$2 = openDB(DB_NAME, DB_VERSION, {
        upgrade: (db, oldVersion) => {
          switch (oldVersion) {
            case 0:
              try {
                db.createObjectStore(STORE_NAME);
              } catch (e) {
                console.warn(e);
              }
          }
        }
      }).catch((e) => {
        throw ERROR_FACTORY$2.create("idb-open", {
          originalErrorMessage: e.message
        });
      });
    }
    return dbPromise$2;
  }
  async function readHeartbeatsFromIndexedDB(app) {
    try {
      const db = await getDbPromise$2();
      const tx = db.transaction(STORE_NAME);
      const result2 = await tx.objectStore(STORE_NAME).get(computeKey(app));
      await tx.done;
      return result2;
    } catch (e) {
      if (e instanceof FirebaseError) {
        logger$1.warn(e.message);
      } else {
        const idbGetError = ERROR_FACTORY$2.create("idb-get", {
          originalErrorMessage: e?.message
        });
        logger$1.warn(idbGetError.message);
      }
    }
  }
  async function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
    try {
      const db = await getDbPromise$2();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const objectStore = tx.objectStore(STORE_NAME);
      await objectStore.put(heartbeatObject, computeKey(app));
      await tx.done;
    } catch (e) {
      if (e instanceof FirebaseError) {
        logger$1.warn(e.message);
      } else {
        const idbGetError = ERROR_FACTORY$2.create("idb-set", {
          originalErrorMessage: e?.message
        });
        logger$1.warn(idbGetError.message);
      }
    }
  }
  function computeKey(app) {
    return `${app.name}!${app.options.appId}`;
  }
  const MAX_HEADER_BYTES = 1024;
  const MAX_NUM_STORED_HEARTBEATS = 30;
  class HeartbeatServiceImpl {
    constructor(container) {
      this.container = container;
      this._heartbeatsCache = null;
      const app = this.container.getProvider("app").getImmediate();
      this._storage = new HeartbeatStorageImpl(app);
      this._heartbeatsCachePromise = this._storage.read().then((result2) => {
        this._heartbeatsCache = result2;
        return result2;
      });
    }
    /**
     * Called to report a heartbeat. The function will generate
     * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
     * to IndexedDB.
     * Note that we only store one heartbeat per day. So if a heartbeat for today is
     * already logged, subsequent calls to this function in the same day will be ignored.
     */
    async triggerHeartbeat() {
      try {
        const platformLogger = this.container.getProvider("platform-logger").getImmediate();
        const agent = platformLogger.getPlatformInfoString();
        const date = getUTCDateString();
        if (this._heartbeatsCache?.heartbeats == null) {
          this._heartbeatsCache = await this._heartbeatsCachePromise;
          if (this._heartbeatsCache?.heartbeats == null) {
            return;
          }
        }
        if (this._heartbeatsCache.lastSentHeartbeatDate === date || this._heartbeatsCache.heartbeats.some((singleDateHeartbeat) => singleDateHeartbeat.date === date)) {
          return;
        } else {
          this._heartbeatsCache.heartbeats.push({ date, agent });
          if (this._heartbeatsCache.heartbeats.length > MAX_NUM_STORED_HEARTBEATS) {
            const earliestHeartbeatIdx = getEarliestHeartbeatIdx(this._heartbeatsCache.heartbeats);
            this._heartbeatsCache.heartbeats.splice(earliestHeartbeatIdx, 1);
          }
        }
        return this._storage.overwrite(this._heartbeatsCache);
      } catch (e) {
        logger$1.warn(e);
      }
    }
    /**
     * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
     * It also clears all heartbeats from memory as well as in IndexedDB.
     *
     * NOTE: Consuming product SDKs should not send the header if this method
     * returns an empty string.
     */
    async getHeartbeatsHeader() {
      try {
        if (this._heartbeatsCache === null) {
          await this._heartbeatsCachePromise;
        }
        if (this._heartbeatsCache?.heartbeats == null || this._heartbeatsCache.heartbeats.length === 0) {
          return "";
        }
        const date = getUTCDateString();
        const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
        const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
        this._heartbeatsCache.lastSentHeartbeatDate = date;
        if (unsentEntries.length > 0) {
          this._heartbeatsCache.heartbeats = unsentEntries;
          await this._storage.overwrite(this._heartbeatsCache);
        } else {
          this._heartbeatsCache.heartbeats = [];
          void this._storage.overwrite(this._heartbeatsCache);
        }
        return headerString;
      } catch (e) {
        logger$1.warn(e);
        return "";
      }
    }
  }
  function getUTCDateString() {
    const today = /* @__PURE__ */ new Date();
    return today.toISOString().substring(0, 10);
  }
  function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
    const heartbeatsToSend = [];
    let unsentEntries = heartbeatsCache.slice();
    for (const singleDateHeartbeat of heartbeatsCache) {
      const heartbeatEntry = heartbeatsToSend.find((hb) => hb.agent === singleDateHeartbeat.agent);
      if (!heartbeatEntry) {
        heartbeatsToSend.push({
          agent: singleDateHeartbeat.agent,
          dates: [singleDateHeartbeat.date]
        });
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatsToSend.pop();
          break;
        }
      } else {
        heartbeatEntry.dates.push(singleDateHeartbeat.date);
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatEntry.dates.pop();
          break;
        }
      }
      unsentEntries = unsentEntries.slice(1);
    }
    return {
      heartbeatsToSend,
      unsentEntries
    };
  }
  class HeartbeatStorageImpl {
    constructor(app) {
      this.app = app;
      this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
    }
    async runIndexedDBEnvironmentCheck() {
      if (!isIndexedDBAvailable()) {
        return false;
      } else {
        return validateIndexedDBOpenable().then(() => true).catch(() => false);
      }
    }
    /**
     * Read all heartbeats.
     */
    async read() {
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return { heartbeats: [] };
      } else {
        const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
        if (idbHeartbeatObject?.heartbeats) {
          return idbHeartbeatObject;
        } else {
          return { heartbeats: [] };
        }
      }
    }
    // overwrite the storage with the provided heartbeats
    async overwrite(heartbeatsObject) {
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return;
      } else {
        const existingHeartbeatsObject = await this.read();
        return writeHeartbeatsToIndexedDB(this.app, {
          lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ?? existingHeartbeatsObject.lastSentHeartbeatDate,
          heartbeats: heartbeatsObject.heartbeats
        });
      }
    }
    // add heartbeats
    async add(heartbeatsObject) {
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return;
      } else {
        const existingHeartbeatsObject = await this.read();
        return writeHeartbeatsToIndexedDB(this.app, {
          lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ?? existingHeartbeatsObject.lastSentHeartbeatDate,
          heartbeats: [
            ...existingHeartbeatsObject.heartbeats,
            ...heartbeatsObject.heartbeats
          ]
        });
      }
    }
  }
  function countBytes(heartbeatsCache) {
    return base64urlEncodeWithoutPadding(
      // heartbeatsCache wrapper properties
      JSON.stringify({ version: 2, heartbeats: heartbeatsCache })
    ).length;
  }
  function getEarliestHeartbeatIdx(heartbeats) {
    if (heartbeats.length === 0) {
      return -1;
    }
    let earliestHeartbeatIdx = 0;
    let earliestHeartbeatDate = heartbeats[0].date;
    for (let i = 1; i < heartbeats.length; i++) {
      if (heartbeats[i].date < earliestHeartbeatDate) {
        earliestHeartbeatDate = heartbeats[i].date;
        earliestHeartbeatIdx = i;
      }
    }
    return earliestHeartbeatIdx;
  }
  function registerCoreComponents(variant) {
    _registerComponent(new Component(
      "platform-logger",
      (container) => new PlatformLoggerServiceImpl(container),
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    _registerComponent(new Component(
      "heartbeat",
      (container) => new HeartbeatServiceImpl(container),
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    registerVersion(name$q, version$1$1, variant);
    registerVersion(name$q, version$1$1, "esm2020");
    registerVersion("fire-js", "");
  }
  registerCoreComponents("");
  var name$1 = "firebase";
  var version$1 = "12.10.0";
  registerVersion(name$1, version$1, "app");
  const name = "@firebase/installations";
  const version = "0.6.20";
  const PENDING_TIMEOUT_MS = 1e4;
  const PACKAGE_VERSION = `w:${version}`;
  const INTERNAL_AUTH_VERSION = "FIS_v2";
  const INSTALLATIONS_API_URL = "https://firebaseinstallations.googleapis.com/v1";
  const TOKEN_EXPIRATION_BUFFER = 60 * 60 * 1e3;
  const SERVICE = "installations";
  const SERVICE_NAME = "Installations";
  const ERROR_DESCRIPTION_MAP = {
    [
      "missing-app-config-values"
      /* ErrorCode.MISSING_APP_CONFIG_VALUES */
    ]: 'Missing App configuration value: "{$valueName}"',
    [
      "not-registered"
      /* ErrorCode.NOT_REGISTERED */
    ]: "Firebase Installation is not registered.",
    [
      "installation-not-found"
      /* ErrorCode.INSTALLATION_NOT_FOUND */
    ]: "Firebase Installation not found.",
    [
      "request-failed"
      /* ErrorCode.REQUEST_FAILED */
    ]: '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
    [
      "app-offline"
      /* ErrorCode.APP_OFFLINE */
    ]: "Could not process request. Application offline.",
    [
      "delete-pending-registration"
      /* ErrorCode.DELETE_PENDING_REGISTRATION */
    ]: "Can't delete installation while there is a pending registration request."
  };
  const ERROR_FACTORY$1 = new ErrorFactory(SERVICE, SERVICE_NAME, ERROR_DESCRIPTION_MAP);
  function isServerError(error) {
    return error instanceof FirebaseError && error.code.includes(
      "request-failed"
      /* ErrorCode.REQUEST_FAILED */
    );
  }
  function getInstallationsEndpoint({ projectId }) {
    return `${INSTALLATIONS_API_URL}/projects/${projectId}/installations`;
  }
  function extractAuthTokenInfoFromResponse(response) {
    return {
      token: response.token,
      requestStatus: 2,
      expiresIn: getExpiresInFromResponseExpiresIn(response.expiresIn),
      creationTime: Date.now()
    };
  }
  async function getErrorFromResponse(requestName, response) {
    const responseJson = await response.json();
    const errorData = responseJson.error;
    return ERROR_FACTORY$1.create("request-failed", {
      requestName,
      serverCode: errorData.code,
      serverMessage: errorData.message,
      serverStatus: errorData.status
    });
  }
  function getHeaders$1({ apiKey }) {
    return new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-goog-api-key": apiKey
    });
  }
  function getHeadersWithAuth(appConfig, { refreshToken }) {
    const headers = getHeaders$1(appConfig);
    headers.append("Authorization", getAuthorizationHeader(refreshToken));
    return headers;
  }
  async function retryIfServerError(fn) {
    const result2 = await fn();
    if (result2.status >= 500 && result2.status < 600) {
      return fn();
    }
    return result2;
  }
  function getExpiresInFromResponseExpiresIn(responseExpiresIn) {
    return Number(responseExpiresIn.replace("s", "000"));
  }
  function getAuthorizationHeader(refreshToken) {
    return `${INTERNAL_AUTH_VERSION} ${refreshToken}`;
  }
  async function createInstallationRequest({ appConfig, heartbeatServiceProvider }, { fid }) {
    const endpoint = getInstallationsEndpoint(appConfig);
    const headers = getHeaders$1(appConfig);
    const heartbeatService = heartbeatServiceProvider.getImmediate({
      optional: true
    });
    if (heartbeatService) {
      const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
      if (heartbeatsHeader) {
        headers.append("x-firebase-client", heartbeatsHeader);
      }
    }
    const body = {
      fid,
      authVersion: INTERNAL_AUTH_VERSION,
      appId: appConfig.appId,
      sdkVersion: PACKAGE_VERSION
    };
    const request = {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    };
    const response = await retryIfServerError(() => fetch(endpoint, request));
    if (response.ok) {
      const responseValue = await response.json();
      const registeredInstallationEntry = {
        fid: responseValue.fid || fid,
        registrationStatus: 2,
        refreshToken: responseValue.refreshToken,
        authToken: extractAuthTokenInfoFromResponse(responseValue.authToken)
      };
      return registeredInstallationEntry;
    } else {
      throw await getErrorFromResponse("Create Installation", response);
    }
  }
  function sleep$1(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  function bufferToBase64UrlSafe(array) {
    const b64 = btoa(String.fromCharCode(...array));
    return b64.replace(/\+/g, "-").replace(/\//g, "_");
  }
  const VALID_FID_PATTERN = /^[cdef][\w-]{21}$/;
  const INVALID_FID = "";
  function generateFid() {
    try {
      const fidByteArray = new Uint8Array(17);
      const crypto = self.crypto || self.msCrypto;
      crypto.getRandomValues(fidByteArray);
      fidByteArray[0] = 112 + fidByteArray[0] % 16;
      const fid = encode(fidByteArray);
      return VALID_FID_PATTERN.test(fid) ? fid : INVALID_FID;
    } catch {
      return INVALID_FID;
    }
  }
  function encode(fidByteArray) {
    const b64String = bufferToBase64UrlSafe(fidByteArray);
    return b64String.substr(0, 22);
  }
  function getKey$1(appConfig) {
    return `${appConfig.appName}!${appConfig.appId}`;
  }
  const fidChangeCallbacks = /* @__PURE__ */ new Map();
  function fidChanged(appConfig, fid) {
    const key = getKey$1(appConfig);
    callFidChangeCallbacks(key, fid);
    broadcastFidChange(key, fid);
  }
  function callFidChangeCallbacks(key, fid) {
    const callbacks = fidChangeCallbacks.get(key);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks) {
      callback(fid);
    }
  }
  function broadcastFidChange(key, fid) {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ key, fid });
    }
    closeBroadcastChannel();
  }
  let broadcastChannel = null;
  function getBroadcastChannel() {
    if (!broadcastChannel && "BroadcastChannel" in self) {
      broadcastChannel = new BroadcastChannel("[Firebase] FID Change");
      broadcastChannel.onmessage = (e) => {
        callFidChangeCallbacks(e.data.key, e.data.fid);
      };
    }
    return broadcastChannel;
  }
  function closeBroadcastChannel() {
    if (fidChangeCallbacks.size === 0 && broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  }
  const DATABASE_NAME$1 = "firebase-installations-database";
  const DATABASE_VERSION$1 = 1;
  const OBJECT_STORE_NAME$1 = "firebase-installations-store";
  let dbPromise$1 = null;
  function getDbPromise$1() {
    if (!dbPromise$1) {
      dbPromise$1 = openDB(DATABASE_NAME$1, DATABASE_VERSION$1, {
        upgrade: (db, oldVersion) => {
          switch (oldVersion) {
            case 0:
              db.createObjectStore(OBJECT_STORE_NAME$1);
          }
        }
      });
    }
    return dbPromise$1;
  }
  async function set(appConfig, value) {
    const key = getKey$1(appConfig);
    const db = await getDbPromise$1();
    const tx = db.transaction(OBJECT_STORE_NAME$1, "readwrite");
    const objectStore = tx.objectStore(OBJECT_STORE_NAME$1);
    const oldValue = await objectStore.get(key);
    await objectStore.put(value, key);
    await tx.done;
    if (!oldValue || oldValue.fid !== value.fid) {
      fidChanged(appConfig, value.fid);
    }
    return value;
  }
  async function remove(appConfig) {
    const key = getKey$1(appConfig);
    const db = await getDbPromise$1();
    const tx = db.transaction(OBJECT_STORE_NAME$1, "readwrite");
    await tx.objectStore(OBJECT_STORE_NAME$1).delete(key);
    await tx.done;
  }
  async function update(appConfig, updateFn) {
    const key = getKey$1(appConfig);
    const db = await getDbPromise$1();
    const tx = db.transaction(OBJECT_STORE_NAME$1, "readwrite");
    const store = tx.objectStore(OBJECT_STORE_NAME$1);
    const oldValue = await store.get(key);
    const newValue = updateFn(oldValue);
    if (newValue === void 0) {
      await store.delete(key);
    } else {
      await store.put(newValue, key);
    }
    await tx.done;
    if (newValue && (!oldValue || oldValue.fid !== newValue.fid)) {
      fidChanged(appConfig, newValue.fid);
    }
    return newValue;
  }
  async function getInstallationEntry(installations) {
    let registrationPromise;
    const installationEntry = await update(installations.appConfig, (oldEntry) => {
      const installationEntry2 = updateOrCreateInstallationEntry(oldEntry);
      const entryWithPromise = triggerRegistrationIfNecessary(installations, installationEntry2);
      registrationPromise = entryWithPromise.registrationPromise;
      return entryWithPromise.installationEntry;
    });
    if (installationEntry.fid === INVALID_FID) {
      return { installationEntry: await registrationPromise };
    }
    return {
      installationEntry,
      registrationPromise
    };
  }
  function updateOrCreateInstallationEntry(oldEntry) {
    const entry = oldEntry || {
      fid: generateFid(),
      registrationStatus: 0
      /* RequestStatus.NOT_STARTED */
    };
    return clearTimedOutRequest(entry);
  }
  function triggerRegistrationIfNecessary(installations, installationEntry) {
    if (installationEntry.registrationStatus === 0) {
      if (!navigator.onLine) {
        const registrationPromiseWithError = Promise.reject(ERROR_FACTORY$1.create(
          "app-offline"
          /* ErrorCode.APP_OFFLINE */
        ));
        return {
          installationEntry,
          registrationPromise: registrationPromiseWithError
        };
      }
      const inProgressEntry = {
        fid: installationEntry.fid,
        registrationStatus: 1,
        registrationTime: Date.now()
      };
      const registrationPromise = registerInstallation(installations, inProgressEntry);
      return { installationEntry: inProgressEntry, registrationPromise };
    } else if (installationEntry.registrationStatus === 1) {
      return {
        installationEntry,
        registrationPromise: waitUntilFidRegistration(installations)
      };
    } else {
      return { installationEntry };
    }
  }
  async function registerInstallation(installations, installationEntry) {
    try {
      const registeredInstallationEntry = await createInstallationRequest(installations, installationEntry);
      return set(installations.appConfig, registeredInstallationEntry);
    } catch (e) {
      if (isServerError(e) && e.customData.serverCode === 409) {
        await remove(installations.appConfig);
      } else {
        await set(installations.appConfig, {
          fid: installationEntry.fid,
          registrationStatus: 0
          /* RequestStatus.NOT_STARTED */
        });
      }
      throw e;
    }
  }
  async function waitUntilFidRegistration(installations) {
    let entry = await updateInstallationRequest(installations.appConfig);
    while (entry.registrationStatus === 1) {
      await sleep$1(100);
      entry = await updateInstallationRequest(installations.appConfig);
    }
    if (entry.registrationStatus === 0) {
      const { installationEntry, registrationPromise } = await getInstallationEntry(installations);
      if (registrationPromise) {
        return registrationPromise;
      } else {
        return installationEntry;
      }
    }
    return entry;
  }
  function updateInstallationRequest(appConfig) {
    return update(appConfig, (oldEntry) => {
      if (!oldEntry) {
        throw ERROR_FACTORY$1.create(
          "installation-not-found"
          /* ErrorCode.INSTALLATION_NOT_FOUND */
        );
      }
      return clearTimedOutRequest(oldEntry);
    });
  }
  function clearTimedOutRequest(entry) {
    if (hasInstallationRequestTimedOut(entry)) {
      return {
        fid: entry.fid,
        registrationStatus: 0
        /* RequestStatus.NOT_STARTED */
      };
    }
    return entry;
  }
  function hasInstallationRequestTimedOut(installationEntry) {
    return installationEntry.registrationStatus === 1 && installationEntry.registrationTime + PENDING_TIMEOUT_MS < Date.now();
  }
  async function generateAuthTokenRequest({ appConfig, heartbeatServiceProvider }, installationEntry) {
    const endpoint = getGenerateAuthTokenEndpoint(appConfig, installationEntry);
    const headers = getHeadersWithAuth(appConfig, installationEntry);
    const heartbeatService = heartbeatServiceProvider.getImmediate({
      optional: true
    });
    if (heartbeatService) {
      const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
      if (heartbeatsHeader) {
        headers.append("x-firebase-client", heartbeatsHeader);
      }
    }
    const body = {
      installation: {
        sdkVersion: PACKAGE_VERSION,
        appId: appConfig.appId
      }
    };
    const request = {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    };
    const response = await retryIfServerError(() => fetch(endpoint, request));
    if (response.ok) {
      const responseValue = await response.json();
      const completedAuthToken = extractAuthTokenInfoFromResponse(responseValue);
      return completedAuthToken;
    } else {
      throw await getErrorFromResponse("Generate Auth Token", response);
    }
  }
  function getGenerateAuthTokenEndpoint(appConfig, { fid }) {
    return `${getInstallationsEndpoint(appConfig)}/${fid}/authTokens:generate`;
  }
  async function refreshAuthToken(installations, forceRefresh = false) {
    let tokenPromise;
    const entry = await update(installations.appConfig, (oldEntry) => {
      if (!isEntryRegistered(oldEntry)) {
        throw ERROR_FACTORY$1.create(
          "not-registered"
          /* ErrorCode.NOT_REGISTERED */
        );
      }
      const oldAuthToken = oldEntry.authToken;
      if (!forceRefresh && isAuthTokenValid(oldAuthToken)) {
        return oldEntry;
      } else if (oldAuthToken.requestStatus === 1) {
        tokenPromise = waitUntilAuthTokenRequest(installations, forceRefresh);
        return oldEntry;
      } else {
        if (!navigator.onLine) {
          throw ERROR_FACTORY$1.create(
            "app-offline"
            /* ErrorCode.APP_OFFLINE */
          );
        }
        const inProgressEntry = makeAuthTokenRequestInProgressEntry(oldEntry);
        tokenPromise = fetchAuthTokenFromServer(installations, inProgressEntry);
        return inProgressEntry;
      }
    });
    const authToken = tokenPromise ? await tokenPromise : entry.authToken;
    return authToken;
  }
  async function waitUntilAuthTokenRequest(installations, forceRefresh) {
    let entry = await updateAuthTokenRequest(installations.appConfig);
    while (entry.authToken.requestStatus === 1) {
      await sleep$1(100);
      entry = await updateAuthTokenRequest(installations.appConfig);
    }
    const authToken = entry.authToken;
    if (authToken.requestStatus === 0) {
      return refreshAuthToken(installations, forceRefresh);
    } else {
      return authToken;
    }
  }
  function updateAuthTokenRequest(appConfig) {
    return update(appConfig, (oldEntry) => {
      if (!isEntryRegistered(oldEntry)) {
        throw ERROR_FACTORY$1.create(
          "not-registered"
          /* ErrorCode.NOT_REGISTERED */
        );
      }
      const oldAuthToken = oldEntry.authToken;
      if (hasAuthTokenRequestTimedOut(oldAuthToken)) {
        return {
          ...oldEntry,
          authToken: {
            requestStatus: 0
            /* RequestStatus.NOT_STARTED */
          }
        };
      }
      return oldEntry;
    });
  }
  async function fetchAuthTokenFromServer(installations, installationEntry) {
    try {
      const authToken = await generateAuthTokenRequest(installations, installationEntry);
      const updatedInstallationEntry = {
        ...installationEntry,
        authToken
      };
      await set(installations.appConfig, updatedInstallationEntry);
      return authToken;
    } catch (e) {
      if (isServerError(e) && (e.customData.serverCode === 401 || e.customData.serverCode === 404)) {
        await remove(installations.appConfig);
      } else {
        const updatedInstallationEntry = {
          ...installationEntry,
          authToken: {
            requestStatus: 0
            /* RequestStatus.NOT_STARTED */
          }
        };
        await set(installations.appConfig, updatedInstallationEntry);
      }
      throw e;
    }
  }
  function isEntryRegistered(installationEntry) {
    return installationEntry !== void 0 && installationEntry.registrationStatus === 2;
  }
  function isAuthTokenValid(authToken) {
    return authToken.requestStatus === 2 && !isAuthTokenExpired(authToken);
  }
  function isAuthTokenExpired(authToken) {
    const now = Date.now();
    return now < authToken.creationTime || authToken.creationTime + authToken.expiresIn < now + TOKEN_EXPIRATION_BUFFER;
  }
  function makeAuthTokenRequestInProgressEntry(oldEntry) {
    const inProgressAuthToken = {
      requestStatus: 1,
      requestTime: Date.now()
    };
    return {
      ...oldEntry,
      authToken: inProgressAuthToken
    };
  }
  function hasAuthTokenRequestTimedOut(authToken) {
    return authToken.requestStatus === 1 && authToken.requestTime + PENDING_TIMEOUT_MS < Date.now();
  }
  async function getId(installations) {
    const installationsImpl = installations;
    const { installationEntry, registrationPromise } = await getInstallationEntry(installationsImpl);
    if (registrationPromise) {
      registrationPromise.catch(console.error);
    } else {
      refreshAuthToken(installationsImpl).catch(console.error);
    }
    return installationEntry.fid;
  }
  async function getToken(installations, forceRefresh = false) {
    const installationsImpl = installations;
    await completeInstallationRegistration(installationsImpl);
    const authToken = await refreshAuthToken(installationsImpl, forceRefresh);
    return authToken.token;
  }
  async function completeInstallationRegistration(installations) {
    const { registrationPromise } = await getInstallationEntry(installations);
    if (registrationPromise) {
      await registrationPromise;
    }
  }
  function extractAppConfig$1(app) {
    if (!app || !app.options) {
      throw getMissingValueError$1("App Configuration");
    }
    if (!app.name) {
      throw getMissingValueError$1("App Name");
    }
    const configKeys = [
      "projectId",
      "apiKey",
      "appId"
    ];
    for (const keyName of configKeys) {
      if (!app.options[keyName]) {
        throw getMissingValueError$1(keyName);
      }
    }
    return {
      appName: app.name,
      projectId: app.options.projectId,
      apiKey: app.options.apiKey,
      appId: app.options.appId
    };
  }
  function getMissingValueError$1(valueName) {
    return ERROR_FACTORY$1.create("missing-app-config-values", {
      valueName
    });
  }
  const INSTALLATIONS_NAME = "installations";
  const INSTALLATIONS_NAME_INTERNAL = "installations-internal";
  const publicFactory = (container) => {
    const app = container.getProvider("app").getImmediate();
    const appConfig = extractAppConfig$1(app);
    const heartbeatServiceProvider = _getProvider(app, "heartbeat");
    const installationsImpl = {
      app,
      appConfig,
      heartbeatServiceProvider,
      _delete: () => Promise.resolve()
    };
    return installationsImpl;
  };
  const internalFactory = (container) => {
    const app = container.getProvider("app").getImmediate();
    const installations = _getProvider(app, INSTALLATIONS_NAME).getImmediate();
    const installationsInternal = {
      getId: () => getId(installations),
      getToken: (forceRefresh) => getToken(installations, forceRefresh)
    };
    return installationsInternal;
  };
  function registerInstallations() {
    _registerComponent(new Component(
      INSTALLATIONS_NAME,
      publicFactory,
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ));
    _registerComponent(new Component(
      INSTALLATIONS_NAME_INTERNAL,
      internalFactory,
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
  }
  registerInstallations();
  registerVersion(name, version);
  registerVersion(name, version, "esm2020");
  const DEFAULT_VAPID_KEY = "BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4";
  const ENDPOINT = "https://fcmregistrations.googleapis.com/v1";
  const FCM_MSG = "FCM_MSG";
  const CONSOLE_CAMPAIGN_ID = "google.c.a.c_id";
  const SDK_PLATFORM_WEB = 3;
  const EVENT_MESSAGE_DELIVERED = 1;
  var MessageType$1;
  (function(MessageType2) {
    MessageType2[MessageType2["DATA_MESSAGE"] = 1] = "DATA_MESSAGE";
    MessageType2[MessageType2["DISPLAY_NOTIFICATION"] = 3] = "DISPLAY_NOTIFICATION";
  })(MessageType$1 || (MessageType$1 = {}));
  var MessageType;
  (function(MessageType2) {
    MessageType2["PUSH_RECEIVED"] = "push-received";
    MessageType2["NOTIFICATION_CLICKED"] = "notification-clicked";
  })(MessageType || (MessageType = {}));
  function arrayToBase64(array) {
    const uint8Array = new Uint8Array(array);
    const base64String = btoa(String.fromCharCode(...uint8Array));
    return base64String.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function base64ToArray(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base642 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = atob(base642);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  const OLD_DB_NAME = "fcm_token_details_db";
  const OLD_DB_VERSION = 5;
  const OLD_OBJECT_STORE_NAME = "fcm_token_object_Store";
  async function migrateOldDatabase(senderId) {
    if ("databases" in indexedDB) {
      const databases = await indexedDB.databases();
      const dbNames = databases.map((db2) => db2.name);
      if (!dbNames.includes(OLD_DB_NAME)) {
        return null;
      }
    }
    let tokenDetails = null;
    const db = await openDB(OLD_DB_NAME, OLD_DB_VERSION, {
      upgrade: async (db2, oldVersion, newVersion, upgradeTransaction) => {
        if (oldVersion < 2) {
          return;
        }
        if (!db2.objectStoreNames.contains(OLD_OBJECT_STORE_NAME)) {
          return;
        }
        const objectStore = upgradeTransaction.objectStore(OLD_OBJECT_STORE_NAME);
        const value = await objectStore.index("fcmSenderId").get(senderId);
        await objectStore.clear();
        if (!value) {
          return;
        }
        if (oldVersion === 2) {
          const oldDetails = value;
          if (!oldDetails.auth || !oldDetails.p256dh || !oldDetails.endpoint) {
            return;
          }
          tokenDetails = {
            token: oldDetails.fcmToken,
            createTime: oldDetails.createTime ?? Date.now(),
            subscriptionOptions: {
              auth: oldDetails.auth,
              p256dh: oldDetails.p256dh,
              endpoint: oldDetails.endpoint,
              swScope: oldDetails.swScope,
              vapidKey: typeof oldDetails.vapidKey === "string" ? oldDetails.vapidKey : arrayToBase64(oldDetails.vapidKey)
            }
          };
        } else if (oldVersion === 3) {
          const oldDetails = value;
          tokenDetails = {
            token: oldDetails.fcmToken,
            createTime: oldDetails.createTime,
            subscriptionOptions: {
              auth: arrayToBase64(oldDetails.auth),
              p256dh: arrayToBase64(oldDetails.p256dh),
              endpoint: oldDetails.endpoint,
              swScope: oldDetails.swScope,
              vapidKey: arrayToBase64(oldDetails.vapidKey)
            }
          };
        } else if (oldVersion === 4) {
          const oldDetails = value;
          tokenDetails = {
            token: oldDetails.fcmToken,
            createTime: oldDetails.createTime,
            subscriptionOptions: {
              auth: arrayToBase64(oldDetails.auth),
              p256dh: arrayToBase64(oldDetails.p256dh),
              endpoint: oldDetails.endpoint,
              swScope: oldDetails.swScope,
              vapidKey: arrayToBase64(oldDetails.vapidKey)
            }
          };
        }
      }
    });
    db.close();
    await deleteDB(OLD_DB_NAME);
    await deleteDB("fcm_vapid_details_db");
    await deleteDB("undefined");
    return checkTokenDetails(tokenDetails) ? tokenDetails : null;
  }
  function checkTokenDetails(tokenDetails) {
    if (!tokenDetails || !tokenDetails.subscriptionOptions) {
      return false;
    }
    const { subscriptionOptions } = tokenDetails;
    return typeof tokenDetails.createTime === "number" && tokenDetails.createTime > 0 && typeof tokenDetails.token === "string" && tokenDetails.token.length > 0 && typeof subscriptionOptions.auth === "string" && subscriptionOptions.auth.length > 0 && typeof subscriptionOptions.p256dh === "string" && subscriptionOptions.p256dh.length > 0 && typeof subscriptionOptions.endpoint === "string" && subscriptionOptions.endpoint.length > 0 && typeof subscriptionOptions.swScope === "string" && subscriptionOptions.swScope.length > 0 && typeof subscriptionOptions.vapidKey === "string" && subscriptionOptions.vapidKey.length > 0;
  }
  const DATABASE_NAME = "firebase-messaging-database";
  const DATABASE_VERSION = 1;
  const OBJECT_STORE_NAME = "firebase-messaging-store";
  let dbPromise = null;
  function getDbPromise() {
    if (!dbPromise) {
      dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
        upgrade: (upgradeDb, oldVersion) => {
          switch (oldVersion) {
            case 0:
              upgradeDb.createObjectStore(OBJECT_STORE_NAME);
          }
        }
      });
    }
    return dbPromise;
  }
  async function dbGet(firebaseDependencies) {
    const key = getKey(firebaseDependencies);
    const db = await getDbPromise();
    const tokenDetails = await db.transaction(OBJECT_STORE_NAME).objectStore(OBJECT_STORE_NAME).get(key);
    if (tokenDetails) {
      return tokenDetails;
    } else {
      const oldTokenDetails = await migrateOldDatabase(firebaseDependencies.appConfig.senderId);
      if (oldTokenDetails) {
        await dbSet(firebaseDependencies, oldTokenDetails);
        return oldTokenDetails;
      }
    }
  }
  async function dbSet(firebaseDependencies, tokenDetails) {
    const key = getKey(firebaseDependencies);
    const db = await getDbPromise();
    const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
    await tx.objectStore(OBJECT_STORE_NAME).put(tokenDetails, key);
    await tx.done;
    return tokenDetails;
  }
  async function dbRemove(firebaseDependencies) {
    const key = getKey(firebaseDependencies);
    const db = await getDbPromise();
    const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
    await tx.objectStore(OBJECT_STORE_NAME).delete(key);
    await tx.done;
  }
  function getKey({ appConfig }) {
    return appConfig.appId;
  }
  const ERROR_MAP = {
    [
      "missing-app-config-values"
      /* ErrorCode.MISSING_APP_CONFIG_VALUES */
    ]: 'Missing App configuration value: "{$valueName}"',
    [
      "only-available-in-window"
      /* ErrorCode.AVAILABLE_IN_WINDOW */
    ]: "This method is available in a Window context.",
    [
      "only-available-in-sw"
      /* ErrorCode.AVAILABLE_IN_SW */
    ]: "This method is available in a service worker context.",
    [
      "permission-default"
      /* ErrorCode.PERMISSION_DEFAULT */
    ]: "The notification permission was not granted and dismissed instead.",
    [
      "permission-blocked"
      /* ErrorCode.PERMISSION_BLOCKED */
    ]: "The notification permission was not granted and blocked instead.",
    [
      "unsupported-browser"
      /* ErrorCode.UNSUPPORTED_BROWSER */
    ]: "This browser doesn't support the API's required to use the Firebase SDK.",
    [
      "indexed-db-unsupported"
      /* ErrorCode.INDEXED_DB_UNSUPPORTED */
    ]: "This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)",
    [
      "failed-service-worker-registration"
      /* ErrorCode.FAILED_DEFAULT_REGISTRATION */
    ]: "We are unable to register the default service worker. {$browserErrorMessage}",
    [
      "token-subscribe-failed"
      /* ErrorCode.TOKEN_SUBSCRIBE_FAILED */
    ]: "A problem occurred while subscribing the user to FCM: {$errorInfo}",
    [
      "token-subscribe-no-token"
      /* ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN */
    ]: "FCM returned no token when subscribing the user to push.",
    [
      "token-unsubscribe-failed"
      /* ErrorCode.TOKEN_UNSUBSCRIBE_FAILED */
    ]: "A problem occurred while unsubscribing the user from FCM: {$errorInfo}",
    [
      "token-update-failed"
      /* ErrorCode.TOKEN_UPDATE_FAILED */
    ]: "A problem occurred while updating the user from FCM: {$errorInfo}",
    [
      "token-update-no-token"
      /* ErrorCode.TOKEN_UPDATE_NO_TOKEN */
    ]: "FCM returned no token when updating the user to push.",
    [
      "use-sw-after-get-token"
      /* ErrorCode.USE_SW_AFTER_GET_TOKEN */
    ]: "The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.",
    [
      "invalid-sw-registration"
      /* ErrorCode.INVALID_SW_REGISTRATION */
    ]: "The input to useServiceWorker() must be a ServiceWorkerRegistration.",
    [
      "invalid-bg-handler"
      /* ErrorCode.INVALID_BG_HANDLER */
    ]: "The input to setBackgroundMessageHandler() must be a function.",
    [
      "invalid-vapid-key"
      /* ErrorCode.INVALID_VAPID_KEY */
    ]: "The public VAPID key must be a string.",
    [
      "use-vapid-key-after-get-token"
      /* ErrorCode.USE_VAPID_KEY_AFTER_GET_TOKEN */
    ]: "The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."
  };
  const ERROR_FACTORY = new ErrorFactory("messaging", "Messaging", ERROR_MAP);
  async function requestGetToken(firebaseDependencies, subscriptionOptions) {
    const headers = await getHeaders(firebaseDependencies);
    const body = getBody(subscriptionOptions);
    const subscribeOptions = {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    };
    let responseData;
    try {
      const response = await fetch(getEndpoint(firebaseDependencies.appConfig), subscribeOptions);
      responseData = await response.json();
    } catch (err) {
      throw ERROR_FACTORY.create("token-subscribe-failed", {
        errorInfo: err?.toString()
      });
    }
    if (responseData.error) {
      const message = responseData.error.message;
      throw ERROR_FACTORY.create("token-subscribe-failed", {
        errorInfo: message
      });
    }
    if (!responseData.token) {
      throw ERROR_FACTORY.create(
        "token-subscribe-no-token"
        /* ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN */
      );
    }
    return responseData.token;
  }
  async function requestUpdateToken(firebaseDependencies, tokenDetails) {
    const headers = await getHeaders(firebaseDependencies);
    const body = getBody(tokenDetails.subscriptionOptions);
    const updateOptions = {
      method: "PATCH",
      headers,
      body: JSON.stringify(body)
    };
    let responseData;
    try {
      const response = await fetch(`${getEndpoint(firebaseDependencies.appConfig)}/${tokenDetails.token}`, updateOptions);
      responseData = await response.json();
    } catch (err) {
      throw ERROR_FACTORY.create("token-update-failed", {
        errorInfo: err?.toString()
      });
    }
    if (responseData.error) {
      const message = responseData.error.message;
      throw ERROR_FACTORY.create("token-update-failed", {
        errorInfo: message
      });
    }
    if (!responseData.token) {
      throw ERROR_FACTORY.create(
        "token-update-no-token"
        /* ErrorCode.TOKEN_UPDATE_NO_TOKEN */
      );
    }
    return responseData.token;
  }
  async function requestDeleteToken(firebaseDependencies, token) {
    const headers = await getHeaders(firebaseDependencies);
    const unsubscribeOptions = {
      method: "DELETE",
      headers
    };
    try {
      const response = await fetch(`${getEndpoint(firebaseDependencies.appConfig)}/${token}`, unsubscribeOptions);
      const responseData = await response.json();
      if (responseData.error) {
        const message = responseData.error.message;
        throw ERROR_FACTORY.create("token-unsubscribe-failed", {
          errorInfo: message
        });
      }
    } catch (err) {
      throw ERROR_FACTORY.create("token-unsubscribe-failed", {
        errorInfo: err?.toString()
      });
    }
  }
  function getEndpoint({ projectId }) {
    return `${ENDPOINT}/projects/${projectId}/registrations`;
  }
  async function getHeaders({ appConfig, installations }) {
    const authToken = await installations.getToken();
    return new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-goog-api-key": appConfig.apiKey,
      "x-goog-firebase-installations-auth": `FIS ${authToken}`
    });
  }
  function getBody({ p256dh, auth, endpoint, vapidKey }) {
    const body = {
      web: {
        endpoint,
        auth,
        p256dh
      }
    };
    if (vapidKey !== DEFAULT_VAPID_KEY) {
      body.web.applicationPubKey = vapidKey;
    }
    return body;
  }
  const TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1e3;
  async function getTokenInternal(messaging) {
    const pushSubscription = await getPushSubscription(messaging.swRegistration, messaging.vapidKey);
    const subscriptionOptions = {
      vapidKey: messaging.vapidKey,
      swScope: messaging.swRegistration.scope,
      endpoint: pushSubscription.endpoint,
      auth: arrayToBase64(pushSubscription.getKey("auth")),
      p256dh: arrayToBase64(pushSubscription.getKey("p256dh"))
    };
    const tokenDetails = await dbGet(messaging.firebaseDependencies);
    if (!tokenDetails) {
      return getNewToken(messaging.firebaseDependencies, subscriptionOptions);
    } else if (!isTokenValid(tokenDetails.subscriptionOptions, subscriptionOptions)) {
      try {
        await requestDeleteToken(messaging.firebaseDependencies, tokenDetails.token);
      } catch (e) {
        console.warn(e);
      }
      return getNewToken(messaging.firebaseDependencies, subscriptionOptions);
    } else if (Date.now() >= tokenDetails.createTime + TOKEN_EXPIRATION_MS) {
      return updateToken(messaging, {
        token: tokenDetails.token,
        createTime: Date.now(),
        subscriptionOptions
      });
    } else {
      return tokenDetails.token;
    }
  }
  async function deleteTokenInternal(messaging) {
    const tokenDetails = await dbGet(messaging.firebaseDependencies);
    if (tokenDetails) {
      await requestDeleteToken(messaging.firebaseDependencies, tokenDetails.token);
      await dbRemove(messaging.firebaseDependencies);
    }
    const pushSubscription = await messaging.swRegistration.pushManager.getSubscription();
    if (pushSubscription) {
      return pushSubscription.unsubscribe();
    }
    return true;
  }
  async function updateToken(messaging, tokenDetails) {
    try {
      const updatedToken = await requestUpdateToken(messaging.firebaseDependencies, tokenDetails);
      const updatedTokenDetails = {
        ...tokenDetails,
        token: updatedToken,
        createTime: Date.now()
      };
      await dbSet(messaging.firebaseDependencies, updatedTokenDetails);
      return updatedToken;
    } catch (e) {
      throw e;
    }
  }
  async function getNewToken(firebaseDependencies, subscriptionOptions) {
    const token = await requestGetToken(firebaseDependencies, subscriptionOptions);
    const tokenDetails = {
      token,
      createTime: Date.now(),
      subscriptionOptions
    };
    await dbSet(firebaseDependencies, tokenDetails);
    return tokenDetails.token;
  }
  async function getPushSubscription(swRegistration, vapidKey) {
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      return subscription;
    }
    return swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      // Chrome <= 75 doesn't support base64-encoded VAPID key. For backward compatibility, VAPID key
      // submitted to pushManager#subscribe must be of type Uint8Array.
      applicationServerKey: base64ToArray(vapidKey)
    });
  }
  function isTokenValid(dbOptions, currentOptions) {
    const isVapidKeyEqual = currentOptions.vapidKey === dbOptions.vapidKey;
    const isEndpointEqual = currentOptions.endpoint === dbOptions.endpoint;
    const isAuthEqual = currentOptions.auth === dbOptions.auth;
    const isP256dhEqual = currentOptions.p256dh === dbOptions.p256dh;
    return isVapidKeyEqual && isEndpointEqual && isAuthEqual && isP256dhEqual;
  }
  function externalizePayload(internalPayload) {
    const payload = {
      from: internalPayload.from,
      // eslint-disable-next-line camelcase
      collapseKey: internalPayload.collapse_key,
      // eslint-disable-next-line camelcase
      messageId: internalPayload.fcmMessageId
    };
    propagateNotificationPayload(payload, internalPayload);
    propagateDataPayload(payload, internalPayload);
    propagateFcmOptions(payload, internalPayload);
    return payload;
  }
  function propagateNotificationPayload(payload, messagePayloadInternal) {
    if (!messagePayloadInternal.notification) {
      return;
    }
    payload.notification = {};
    const title = messagePayloadInternal.notification.title;
    if (!!title) {
      payload.notification.title = title;
    }
    const body = messagePayloadInternal.notification.body;
    if (!!body) {
      payload.notification.body = body;
    }
    const image = messagePayloadInternal.notification.image;
    if (!!image) {
      payload.notification.image = image;
    }
    const icon = messagePayloadInternal.notification.icon;
    if (!!icon) {
      payload.notification.icon = icon;
    }
  }
  function propagateDataPayload(payload, messagePayloadInternal) {
    if (!messagePayloadInternal.data) {
      return;
    }
    payload.data = messagePayloadInternal.data;
  }
  function propagateFcmOptions(payload, messagePayloadInternal) {
    if (!messagePayloadInternal.fcmOptions && !messagePayloadInternal.notification?.click_action) {
      return;
    }
    payload.fcmOptions = {};
    const link = messagePayloadInternal.fcmOptions?.link ?? messagePayloadInternal.notification?.click_action;
    if (!!link) {
      payload.fcmOptions.link = link;
    }
    const analyticsLabel = messagePayloadInternal.fcmOptions?.analytics_label;
    if (!!analyticsLabel) {
      payload.fcmOptions.analyticsLabel = analyticsLabel;
    }
  }
  function isConsoleMessage(data) {
    return typeof data === "object" && !!data && CONSOLE_CAMPAIGN_ID in data;
  }
  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  async function stageLog(messaging, internalPayload) {
    const fcmEvent = createFcmEvent(internalPayload, await messaging.firebaseDependencies.installations.getId());
    createAndEnqueueLogEvent(messaging, fcmEvent, internalPayload.productId);
  }
  function createFcmEvent(internalPayload, fid) {
    const fcmEvent = {};
    if (!!internalPayload.from) {
      fcmEvent.project_number = internalPayload.from;
    }
    if (!!internalPayload.fcmMessageId) {
      fcmEvent.message_id = internalPayload.fcmMessageId;
    }
    fcmEvent.instance_id = fid;
    if (!!internalPayload.notification) {
      fcmEvent.message_type = MessageType$1.DISPLAY_NOTIFICATION.toString();
    } else {
      fcmEvent.message_type = MessageType$1.DATA_MESSAGE.toString();
    }
    fcmEvent.sdk_platform = SDK_PLATFORM_WEB.toString();
    fcmEvent.package_name = self.origin.replace(/(^\w+:|^)\/\//, "");
    if (!!internalPayload.collapse_key) {
      fcmEvent.collapse_key = internalPayload.collapse_key;
    }
    fcmEvent.event = EVENT_MESSAGE_DELIVERED.toString();
    if (!!internalPayload.fcmOptions?.analytics_label) {
      fcmEvent.analytics_label = internalPayload.fcmOptions?.analytics_label;
    }
    return fcmEvent;
  }
  function createAndEnqueueLogEvent(messaging, fcmEvent, productId) {
    const logEvent = {};
    logEvent.event_time_ms = Math.floor(Date.now()).toString();
    logEvent.source_extension_json_proto3 = JSON.stringify({
      messaging_client_event: fcmEvent
    });
    if (!!productId) {
      logEvent.compliance_data = buildComplianceData(productId);
    }
    messaging.logEvents.push(logEvent);
  }
  function buildComplianceData(productId) {
    const complianceData = {
      privacy_context: {
        prequest: {
          origin_associated_product_id: productId
        }
      }
    };
    return complianceData;
  }
  async function onSubChange(event, messaging) {
    const { newSubscription } = event;
    if (!newSubscription) {
      await deleteTokenInternal(messaging);
      return;
    }
    const tokenDetails = await dbGet(messaging.firebaseDependencies);
    await deleteTokenInternal(messaging);
    messaging.vapidKey = tokenDetails?.subscriptionOptions?.vapidKey ?? DEFAULT_VAPID_KEY;
    await getTokenInternal(messaging);
  }
  async function onPush(event, messaging) {
    const internalPayload = getMessagePayloadInternal(event);
    if (!internalPayload) {
      return;
    }
    if (messaging.deliveryMetricsExportedToBigQueryEnabled) {
      await stageLog(messaging, internalPayload);
    }
    const clientList = await getClientList();
    if (hasVisibleClients(clientList)) {
      return sendMessagePayloadInternalToWindows(clientList, internalPayload);
    }
    if (!!internalPayload.notification) {
      await showNotification(wrapInternalPayload(internalPayload));
    }
    if (!messaging) {
      return;
    }
    if (!!messaging.onBackgroundMessageHandler) {
      const payload = externalizePayload(internalPayload);
      if (typeof messaging.onBackgroundMessageHandler === "function") {
        await messaging.onBackgroundMessageHandler(payload);
      } else {
        messaging.onBackgroundMessageHandler.next(payload);
      }
    }
  }
  async function onNotificationClick(event) {
    const internalPayload = event.notification?.data?.[FCM_MSG];
    if (!internalPayload) {
      return;
    } else if (event.action) {
      return;
    }
    event.stopImmediatePropagation();
    event.notification.close();
    const link = getLink(internalPayload);
    if (!link) {
      return;
    }
    const url = new URL(link, self.location.href);
    const originUrl = new URL(self.location.origin);
    if (url.host !== originUrl.host) {
      return;
    }
    let client = await getWindowClient(url);
    if (!client) {
      client = await self.clients.openWindow(link);
      await sleep(3e3);
    } else {
      client = await client.focus();
    }
    if (!client) {
      return;
    }
    internalPayload.messageType = MessageType.NOTIFICATION_CLICKED;
    internalPayload.isFirebaseMessaging = true;
    return client.postMessage(internalPayload);
  }
  function wrapInternalPayload(internalPayload) {
    const wrappedInternalPayload = {
      ...internalPayload.notification
    };
    wrappedInternalPayload.data = {
      [FCM_MSG]: internalPayload
    };
    return wrappedInternalPayload;
  }
  function getMessagePayloadInternal({ data }) {
    if (!data) {
      return null;
    }
    try {
      return data.json();
    } catch (err) {
      return null;
    }
  }
  async function getWindowClient(url) {
    const clientList = await getClientList();
    for (const client of clientList) {
      const clientUrl = new URL(client.url, self.location.href);
      if (url.host === clientUrl.host) {
        return client;
      }
    }
    return null;
  }
  function hasVisibleClients(clientList) {
    return clientList.some((client) => client.visibilityState === "visible" && // Ignore chrome-extension clients as that matches the background pages of extensions, which
    // are always considered visible for some reason.
    !client.url.startsWith("chrome-extension://"));
  }
  function sendMessagePayloadInternalToWindows(clientList, internalPayload) {
    internalPayload.isFirebaseMessaging = true;
    internalPayload.messageType = MessageType.PUSH_RECEIVED;
    for (const client of clientList) {
      client.postMessage(internalPayload);
    }
  }
  function getClientList() {
    return self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
      // TS doesn't know that "type: 'window'" means it'll return WindowClient[]
    });
  }
  function showNotification(notificationPayloadInternal) {
    const { actions } = notificationPayloadInternal;
    const { maxActions } = Notification;
    if (actions && maxActions && actions.length > maxActions) {
      console.warn(`This browser only supports ${maxActions} actions. The remaining actions will not be displayed.`);
    }
    return self.registration.showNotification(
      /* title= */
      notificationPayloadInternal.title ?? "",
      notificationPayloadInternal
    );
  }
  function getLink(payload) {
    const link = payload.fcmOptions?.link ?? payload.notification?.click_action;
    if (link) {
      return link;
    }
    if (isConsoleMessage(payload.data)) {
      return self.location.origin;
    } else {
      return null;
    }
  }
  function extractAppConfig(app) {
    if (!app || !app.options) {
      throw getMissingValueError("App Configuration Object");
    }
    if (!app.name) {
      throw getMissingValueError("App Name");
    }
    const configKeys = [
      "projectId",
      "apiKey",
      "appId",
      "messagingSenderId"
    ];
    const { options } = app;
    for (const keyName of configKeys) {
      if (!options[keyName]) {
        throw getMissingValueError(keyName);
      }
    }
    return {
      appName: app.name,
      projectId: options.projectId,
      apiKey: options.apiKey,
      appId: options.appId,
      senderId: options.messagingSenderId
    };
  }
  function getMissingValueError(valueName) {
    return ERROR_FACTORY.create("missing-app-config-values", {
      valueName
    });
  }
  class MessagingService {
    constructor(app, installations, analyticsProvider) {
      this.deliveryMetricsExportedToBigQueryEnabled = false;
      this.onBackgroundMessageHandler = null;
      this.onMessageHandler = null;
      this.logEvents = [];
      this.isLogServiceStarted = false;
      const appConfig = extractAppConfig(app);
      this.firebaseDependencies = {
        app,
        appConfig,
        installations,
        analyticsProvider
      };
    }
    _delete() {
      return Promise.resolve();
    }
  }
  const SwMessagingFactory = (container) => {
    const messaging = new MessagingService(container.getProvider("app").getImmediate(), container.getProvider("installations-internal").getImmediate(), container.getProvider("analytics-internal"));
    self.addEventListener("push", (e) => {
      e.waitUntil(onPush(e, messaging));
    });
    self.addEventListener("pushsubscriptionchange", (e) => {
      e.waitUntil(onSubChange(e, messaging));
    });
    self.addEventListener("notificationclick", (e) => {
      e.waitUntil(onNotificationClick(e));
    });
    return messaging;
  };
  function registerMessagingInSw() {
    _registerComponent(new Component(
      "messaging-sw",
      SwMessagingFactory,
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ));
  }
  async function isSwSupported() {
    return isIndexedDBAvailable() && await validateIndexedDBOpenable() && "PushManager" in self && "Notification" in self && ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification") && PushSubscription.prototype.hasOwnProperty("getKey");
  }
  function onBackgroundMessage$1(messaging, nextOrObserver) {
    if (self.document !== void 0) {
      throw ERROR_FACTORY.create(
        "only-available-in-sw"
        /* ErrorCode.AVAILABLE_IN_SW */
      );
    }
    messaging.onBackgroundMessageHandler = nextOrObserver;
    return () => {
      messaging.onBackgroundMessageHandler = null;
    };
  }
  function getMessagingInSw(app = getApp()) {
    isSwSupported().then((isSupported) => {
      if (!isSupported) {
        throw ERROR_FACTORY.create(
          "unsupported-browser"
          /* ErrorCode.UNSUPPORTED_BROWSER */
        );
      }
    }, (_) => {
      throw ERROR_FACTORY.create(
        "indexed-db-unsupported"
        /* ErrorCode.INDEXED_DB_UNSUPPORTED */
      );
    });
    return _getProvider(getModularInstance(app), "messaging-sw").getImmediate();
  }
  function onBackgroundMessage(messaging, nextOrObserver) {
    messaging = getModularInstance(messaging);
    return onBackgroundMessage$1(messaging, nextOrObserver);
  }
  registerMessagingInSw();
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const __vite_import_meta_env__ = { "WXT_FIREBASE_API_KEY": "AIzaSyB0G5qRW9ATXKFgm-FUHwR_QaCxWa5xno0", "WXT_FIREBASE_APP_ID": "1:859409837977:web:bf6c6c365bfd36f702ed08", "WXT_FIREBASE_AUTH_DOMAIN": "pulsar-push.firebaseapp.com", "WXT_FIREBASE_MESSAGING_SENDER_ID": "859409837977", "WXT_FIREBASE_PROJECT_ID": "pulsar-push", "WXT_FIREBASE_STORAGE_BUCKET": "pulsar-push.firebasestorage.app", "WXT_FIREBASE_VAPID_KEY": "BJI9OsqQTSV3GLQXGEMYnwH13hkIeW6rGOhhRdQsfQEtK3tajL_pH8uaW2wEbnKrpm0eFAEtkkoWnpV_eYGLf6U" };
  const env = __vite_import_meta_env__ ?? {};
  const FIREBASE_MESSAGING_ENV_MAP = {
    apiKey: "WXT_FIREBASE_API_KEY",
    authDomain: "WXT_FIREBASE_AUTH_DOMAIN",
    projectId: "WXT_FIREBASE_PROJECT_ID",
    storageBucket: "WXT_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "WXT_FIREBASE_MESSAGING_SENDER_ID",
    appId: "WXT_FIREBASE_APP_ID",
    vapidKey: "WXT_FIREBASE_VAPID_KEY"
  };
  function getFirebaseWebConfig() {
    return {
      apiKey: env.WXT_FIREBASE_API_KEY ?? "",
      authDomain: env.WXT_FIREBASE_AUTH_DOMAIN ?? "",
      projectId: env.WXT_FIREBASE_PROJECT_ID ?? "",
      storageBucket: env.WXT_FIREBASE_STORAGE_BUCKET ?? "",
      messagingSenderId: env.WXT_FIREBASE_MESSAGING_SENDER_ID ?? "",
      appId: env.WXT_FIREBASE_APP_ID ?? ""
    };
  }
  function getFirebaseVapidKey() {
    return env.WXT_FIREBASE_VAPID_KEY ?? "";
  }
  function getFirebaseMessagingDiagnostics() {
    const firebaseConfig = getFirebaseWebConfig();
    const configValues = {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      vapidKey: getFirebaseVapidKey()
    };
    const missingKeys = Object.entries(configValues).filter(([, value]) => value.trim().length === 0).map(([key]) => FIREBASE_MESSAGING_ENV_MAP[key]);
    return {
      hasConfig: missingKeys.length === 0,
      missingKeys
    };
  }
  const FALLBACK_NOTIFICATION_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7f7p4AAAAASUVORK5CYII=";
  const BACKGROUND_FCM_LOG_PREFIX = "[Pulsar FCM][background]";
  const definition = defineBackground(() => {
    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Background service worker started.`);
    void browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });
    void initializeFirebaseMessaging().catch((error) => {
      console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to initialize Firebase Messaging.`, error);
    });
    browser.runtime.onMessage.addListener((message) => {
      if (!isForegroundNotificationMessage(message)) {
        return false;
      }
      console.info(`${BACKGROUND_FCM_LOG_PREFIX} Received foreground relay message.`, message);
      const title = message.notification?.title ?? "Pulsar Notification";
      const body = message.notification?.body ?? "You have a new message.";
      void createExtensionNotification(title, body);
      return false;
    });
  });
  async function initializeFirebaseMessaging() {
    const diagnostics = getFirebaseMessagingDiagnostics();
    if (!diagnostics.hasConfig) {
      console.warn(`${BACKGROUND_FCM_LOG_PREFIX} Firebase Messaging config is incomplete.`, diagnostics);
      return;
    }
    const supported = await isSwSupported();
    if (!supported) {
      console.warn(`${BACKGROUND_FCM_LOG_PREFIX} Firebase Messaging is not supported in the background context.`);
      return;
    }
    const firebaseApp = getApps()[0] ?? initializeApp(getFirebaseWebConfig());
    const messaging = getMessagingInSw(firebaseApp);
    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Firebase Messaging initialized. Waiting for background payloads.`);
    onBackgroundMessage(messaging, (payload) => {
      console.info(`${BACKGROUND_FCM_LOG_PREFIX} Received background payload.`, payload);
      const title = payload.notification?.title ?? payload.data?.title ?? "Pulsar Notification";
      const body = payload.notification?.body ?? payload.data?.body ?? "You have a new message.";
      void createExtensionNotification(title, body);
    });
  }
  async function createExtensionNotification(title, message) {
    if (!browser.notifications) {
      console.warn(`${BACKGROUND_FCM_LOG_PREFIX} Notifications API is unavailable.`, { title, message });
      return;
    }
    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Creating extension notification.`, { title, message });
    await browser.notifications.create({
      type: "basic",
      title,
      message,
      iconUrl: FALLBACK_NOTIFICATION_ICON
    });
  }
  function isForegroundNotificationMessage(message) {
    if (!message || typeof message !== "object") {
      return false;
    }
    return message.type === "PULSAR/FCM_FOREGROUND_MESSAGE";
  }
  function initPlugins() {
  }
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
    else method("[wxt]", ...args);
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "ws://localhost:3000";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws?.send(JSON.stringify({
        type: "custom",
        event,
        payload
      }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") ws?.dispatchEvent(new CustomEvent(message.event, { detail: message.data }));
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    if (browser.runtime.getManifest().manifest_version == 2) reloadContentScriptMv2();
    else reloadContentScriptMv3(payload);
  }
  async function reloadContentScriptMv3({ registration, contentScript }) {
    if (registration === "runtime") await reloadRuntimeContentScriptMv3(contentScript);
    else await reloadManifestContentScriptMv3(contentScript);
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{
        ...contentScript,
        id,
        css: contentScript.css ?? []
      }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{
        ...contentScript,
        id,
        css: contentScript.css ?? []
      }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      const hasJs = contentScript.js?.find((js) => cs.js?.includes(js));
      const hasCss = contentScript.css?.find((css) => cs.css?.includes(css));
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log("Content script is not registered yet, nothing to reload", contentScript);
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map((match) => new MatchPattern(match));
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(matchingTabs.map(async (tab) => {
      try {
        await browser.tabs.reload(tab.id);
      } catch (err) {
        logger.warn("Failed to reload tab:", err);
      }
    }));
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener("open", () => ws2.sendCustom("wxt:background-initialized"));
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") browser.runtime.reload();
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) console.warn("The background's main() function return a promise, but it must be synchronous");
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  var background_entrypoint_default = result;
  return background_entrypoint_default;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5kZW5vL0BmaXJlYmFzZSt1dGlsQDEuMTQuMC9ub2RlX21vZHVsZXMvQGZpcmViYXNlL3V0aWwvZGlzdC9wb3N0aW5zdGFsbC5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLmRlbm8vQGZpcmViYXNlK3V0aWxAMS4xNC4wL25vZGVfbW9kdWxlcy9AZmlyZWJhc2UvdXRpbC9kaXN0L2luZGV4LmVzbS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8uZGVuby9AZmlyZWJhc2UrY29tcG9uZW50QDAuNy4xL25vZGVfbW9kdWxlcy9AZmlyZWJhc2UvY29tcG9uZW50L2Rpc3QvZXNtL2luZGV4LmVzbS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8uZGVuby9AZmlyZWJhc2UrbG9nZ2VyQDAuNS4wL25vZGVfbW9kdWxlcy9AZmlyZWJhc2UvbG9nZ2VyL2Rpc3QvZXNtL2luZGV4LmVzbS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8uZGVuby9pZGJANy4xLjEvbm9kZV9tb2R1bGVzL2lkYi9idWlsZC93cmFwLWlkYi12YWx1ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8uZGVuby9pZGJANy4xLjEvbm9kZV9tb2R1bGVzL2lkYi9idWlsZC9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8uZGVuby9AZmlyZWJhc2UrYXBwQDAuMTQuOS9ub2RlX21vZHVsZXMvQGZpcmViYXNlL2FwcC9kaXN0L2VzbS9pbmRleC5lc20uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLmRlbm8vZmlyZWJhc2VAMTIuMTAuMC9ub2RlX21vZHVsZXMvZmlyZWJhc2UvYXBwL2Rpc3QvZXNtL2luZGV4LmVzbS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8uZGVuby9AZmlyZWJhc2UraW5zdGFsbGF0aW9uc0AwLjYuMjAvbm9kZV9tb2R1bGVzL0BmaXJlYmFzZS9pbnN0YWxsYXRpb25zL2Rpc3QvZXNtL2luZGV4LmVzbS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8uZGVuby9AZmlyZWJhc2UrbWVzc2FnaW5nQDAuMTIuMjQvbm9kZV9tb2R1bGVzL0BmaXJlYmFzZS9tZXNzYWdpbmcvZGlzdC9lc20vaW5kZXguc3cuZXNtLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5kZW5vL0B3eHQtZGV2K2Jyb3dzZXJAMC4xLjM3L25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLmRlbm8vd3h0QDAuMjAuMTgvbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5kZW5vL3d4dEAwLjIwLjE4L25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9kZWZpbmUtYmFja2dyb3VuZC5tanMiLCIuLi8uLi9lbnRyeXBvaW50cy9zaGFyZWQvZmlyZWJhc2UtY29uZmlnLnRzIiwiLi4vLi4vZW50cnlwb2ludHMvYmFja2dyb3VuZC50cyIsIi4uLy4uL25vZGVfbW9kdWxlcy8uZGVuby9Ad2ViZXh0LWNvcmUrbWF0Y2gtcGF0dGVybnNAMS4wLjMvbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjUgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8vIFRoaXMgdmFsdWUgaXMgcmV0cmlldmVkIGFuZCBoYXJkY29kZWQgYnkgdGhlIE5QTSBwb3N0aW5zdGFsbCBzY3JpcHRcbmNvbnN0IGdldERlZmF1bHRzRnJvbVBvc3RpbnN0YWxsID0gKCkgPT4gdW5kZWZpbmVkO1xuXG5leHBvcnQgeyBnZXREZWZhdWx0c0Zyb21Qb3N0aW5zdGFsbCB9O1xuIiwiaW1wb3J0IHsgZ2V0RGVmYXVsdHNGcm9tUG9zdGluc3RhbGwgfSBmcm9tICcuL3Bvc3RpbnN0YWxsLm1qcyc7XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBmaWxlb3ZlcnZpZXcgRmlyZWJhc2UgY29uc3RhbnRzLiAgU29tZSBvZiB0aGVzZSAoQGRlZmluZXMpIGNhbiBiZSBvdmVycmlkZGVuIGF0IGNvbXBpbGUtdGltZS5cbiAqL1xuY29uc3QgQ09OU1RBTlRTID0ge1xuICAgIC8qKlxuICAgICAqIEBkZWZpbmUge2Jvb2xlYW59IFdoZXRoZXIgdGhpcyBpcyB0aGUgY2xpZW50IE5vZGUuanMgU0RLLlxuICAgICAqL1xuICAgIE5PREVfQ0xJRU5UOiBmYWxzZSxcbiAgICAvKipcbiAgICAgKiBAZGVmaW5lIHtib29sZWFufSBXaGV0aGVyIHRoaXMgaXMgdGhlIEFkbWluIE5vZGUuanMgU0RLLlxuICAgICAqL1xuICAgIE5PREVfQURNSU46IGZhbHNlLFxuICAgIC8qKlxuICAgICAqIEZpcmViYXNlIFNESyBWZXJzaW9uXG4gICAgICovXG4gICAgU0RLX1ZFUlNJT046ICcke0pTQ09SRV9WRVJTSU9OfSdcbn07XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIFRocm93cyBhbiBlcnJvciBpZiB0aGUgcHJvdmlkZWQgYXNzZXJ0aW9uIGlzIGZhbHN5XG4gKi9cbmNvbnN0IGFzc2VydCA9IGZ1bmN0aW9uIChhc3NlcnRpb24sIG1lc3NhZ2UpIHtcbiAgICBpZiAoIWFzc2VydGlvbikge1xuICAgICAgICB0aHJvdyBhc3NlcnRpb25FcnJvcihtZXNzYWdlKTtcbiAgICB9XG59O1xuLyoqXG4gKiBSZXR1cm5zIGFuIEVycm9yIG9iamVjdCBzdWl0YWJsZSBmb3IgdGhyb3dpbmcuXG4gKi9cbmNvbnN0IGFzc2VydGlvbkVycm9yID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICByZXR1cm4gbmV3IEVycm9yKCdGaXJlYmFzZSBEYXRhYmFzZSAoJyArXG4gICAgICAgIENPTlNUQU5UUy5TREtfVkVSU0lPTiArXG4gICAgICAgICcpIElOVEVSTkFMIEFTU0VSVCBGQUlMRUQ6ICcgK1xuICAgICAgICBtZXNzYWdlKTtcbn07XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5jb25zdCBzdHJpbmdUb0J5dGVBcnJheSQxID0gZnVuY3Rpb24gKHN0cikge1xuICAgIC8vIFRPRE8odXNlcik6IFVzZSBuYXRpdmUgaW1wbGVtZW50YXRpb25zIGlmL3doZW4gYXZhaWxhYmxlXG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgbGV0IHAgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBjID0gc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIGlmIChjIDwgMTI4KSB7XG4gICAgICAgICAgICBvdXRbcCsrXSA9IGM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYyA8IDIwNDgpIHtcbiAgICAgICAgICAgIG91dFtwKytdID0gKGMgPj4gNikgfCAxOTI7XG4gICAgICAgICAgICBvdXRbcCsrXSA9IChjICYgNjMpIHwgMTI4O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKChjICYgMHhmYzAwKSA9PT0gMHhkODAwICYmXG4gICAgICAgICAgICBpICsgMSA8IHN0ci5sZW5ndGggJiZcbiAgICAgICAgICAgIChzdHIuY2hhckNvZGVBdChpICsgMSkgJiAweGZjMDApID09PSAweGRjMDApIHtcbiAgICAgICAgICAgIC8vIFN1cnJvZ2F0ZSBQYWlyXG4gICAgICAgICAgICBjID0gMHgxMDAwMCArICgoYyAmIDB4MDNmZikgPDwgMTApICsgKHN0ci5jaGFyQ29kZUF0KCsraSkgJiAweDAzZmYpO1xuICAgICAgICAgICAgb3V0W3ArK10gPSAoYyA+PiAxOCkgfCAyNDA7XG4gICAgICAgICAgICBvdXRbcCsrXSA9ICgoYyA+PiAxMikgJiA2MykgfCAxMjg7XG4gICAgICAgICAgICBvdXRbcCsrXSA9ICgoYyA+PiA2KSAmIDYzKSB8IDEyODtcbiAgICAgICAgICAgIG91dFtwKytdID0gKGMgJiA2MykgfCAxMjg7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvdXRbcCsrXSA9IChjID4+IDEyKSB8IDIyNDtcbiAgICAgICAgICAgIG91dFtwKytdID0gKChjID4+IDYpICYgNjMpIHwgMTI4O1xuICAgICAgICAgICAgb3V0W3ArK10gPSAoYyAmIDYzKSB8IDEyODtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xufTtcbi8qKlxuICogVHVybnMgYW4gYXJyYXkgb2YgbnVtYmVycyBpbnRvIHRoZSBzdHJpbmcgZ2l2ZW4gYnkgdGhlIGNvbmNhdGVuYXRpb24gb2YgdGhlXG4gKiBjaGFyYWN0ZXJzIHRvIHdoaWNoIHRoZSBudW1iZXJzIGNvcnJlc3BvbmQuXG4gKiBAcGFyYW0gYnl0ZXMgQXJyYXkgb2YgbnVtYmVycyByZXByZXNlbnRpbmcgY2hhcmFjdGVycy5cbiAqIEByZXR1cm4gU3RyaW5naWZpY2F0aW9uIG9mIHRoZSBhcnJheS5cbiAqL1xuY29uc3QgYnl0ZUFycmF5VG9TdHJpbmcgPSBmdW5jdGlvbiAoYnl0ZXMpIHtcbiAgICAvLyBUT0RPKHVzZXIpOiBVc2UgbmF0aXZlIGltcGxlbWVudGF0aW9ucyBpZi93aGVuIGF2YWlsYWJsZVxuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGxldCBwb3MgPSAwLCBjID0gMDtcbiAgICB3aGlsZSAocG9zIDwgYnl0ZXMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGMxID0gYnl0ZXNbcG9zKytdO1xuICAgICAgICBpZiAoYzEgPCAxMjgpIHtcbiAgICAgICAgICAgIG91dFtjKytdID0gU3RyaW5nLmZyb21DaGFyQ29kZShjMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYzEgPiAxOTEgJiYgYzEgPCAyMjQpIHtcbiAgICAgICAgICAgIGNvbnN0IGMyID0gYnl0ZXNbcG9zKytdO1xuICAgICAgICAgICAgb3V0W2MrK10gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCgoYzEgJiAzMSkgPDwgNikgfCAoYzIgJiA2MykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGMxID4gMjM5ICYmIGMxIDwgMzY1KSB7XG4gICAgICAgICAgICAvLyBTdXJyb2dhdGUgUGFpclxuICAgICAgICAgICAgY29uc3QgYzIgPSBieXRlc1twb3MrK107XG4gICAgICAgICAgICBjb25zdCBjMyA9IGJ5dGVzW3BvcysrXTtcbiAgICAgICAgICAgIGNvbnN0IGM0ID0gYnl0ZXNbcG9zKytdO1xuICAgICAgICAgICAgY29uc3QgdSA9ICgoKGMxICYgNykgPDwgMTgpIHwgKChjMiAmIDYzKSA8PCAxMikgfCAoKGMzICYgNjMpIDw8IDYpIHwgKGM0ICYgNjMpKSAtXG4gICAgICAgICAgICAgICAgMHgxMDAwMDtcbiAgICAgICAgICAgIG91dFtjKytdID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweGQ4MDAgKyAodSA+PiAxMCkpO1xuICAgICAgICAgICAgb3V0W2MrK10gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4ZGMwMCArICh1ICYgMTAyMykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgYzIgPSBieXRlc1twb3MrK107XG4gICAgICAgICAgICBjb25zdCBjMyA9IGJ5dGVzW3BvcysrXTtcbiAgICAgICAgICAgIG91dFtjKytdID0gU3RyaW5nLmZyb21DaGFyQ29kZSgoKGMxICYgMTUpIDw8IDEyKSB8ICgoYzIgJiA2MykgPDwgNikgfCAoYzMgJiA2MykpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignJyk7XG59O1xuLy8gV2UgZGVmaW5lIGl0IGFzIGFuIG9iamVjdCBsaXRlcmFsIGluc3RlYWQgb2YgYSBjbGFzcyBiZWNhdXNlIGEgY2xhc3MgY29tcGlsZWQgZG93biB0byBlczUgY2FuJ3Rcbi8vIGJlIHRyZWVzaGFrZWQuIGh0dHBzOi8vZ2l0aHViLmNvbS9yb2xsdXAvcm9sbHVwL2lzc3Vlcy8xNjkxXG4vLyBTdGF0aWMgbG9va3VwIG1hcHMsIGxhemlseSBwb3B1bGF0ZWQgYnkgaW5pdF8oKVxuLy8gVE9ETyhkbGFyb2NxdWUpOiBEZWZpbmUgdGhpcyBhcyBhIGNsYXNzLCBzaW5jZSB3ZSBubyBsb25nZXIgdGFyZ2V0IEVTNS5cbmNvbnN0IGJhc2U2NCA9IHtcbiAgICAvKipcbiAgICAgKiBNYXBzIGJ5dGVzIHRvIGNoYXJhY3RlcnMuXG4gICAgICovXG4gICAgYnl0ZVRvQ2hhck1hcF86IG51bGwsXG4gICAgLyoqXG4gICAgICogTWFwcyBjaGFyYWN0ZXJzIHRvIGJ5dGVzLlxuICAgICAqL1xuICAgIGNoYXJUb0J5dGVNYXBfOiBudWxsLFxuICAgIC8qKlxuICAgICAqIE1hcHMgYnl0ZXMgdG8gd2Vic2FmZSBjaGFyYWN0ZXJzLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgYnl0ZVRvQ2hhck1hcFdlYlNhZmVfOiBudWxsLFxuICAgIC8qKlxuICAgICAqIE1hcHMgd2Vic2FmZSBjaGFyYWN0ZXJzIHRvIGJ5dGVzLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgY2hhclRvQnl0ZU1hcFdlYlNhZmVfOiBudWxsLFxuICAgIC8qKlxuICAgICAqIE91ciBkZWZhdWx0IGFscGhhYmV0LCBzaGFyZWQgYmV0d2VlblxuICAgICAqIEVOQ09ERURfVkFMUyBhbmQgRU5DT0RFRF9WQUxTX1dFQlNBRkVcbiAgICAgKi9cbiAgICBFTkNPREVEX1ZBTFNfQkFTRTogJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaJyArICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eicgKyAnMDEyMzQ1Njc4OScsXG4gICAgLyoqXG4gICAgICogT3VyIGRlZmF1bHQgYWxwaGFiZXQuIFZhbHVlIDY0ICg9KSBpcyBzcGVjaWFsOyBpdCBtZWFucyBcIm5vdGhpbmcuXCJcbiAgICAgKi9cbiAgICBnZXQgRU5DT0RFRF9WQUxTKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5FTkNPREVEX1ZBTFNfQkFTRSArICcrLz0nO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogT3VyIHdlYnNhZmUgYWxwaGFiZXQuXG4gICAgICovXG4gICAgZ2V0IEVOQ09ERURfVkFMU19XRUJTQUZFKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5FTkNPREVEX1ZBTFNfQkFTRSArICctXy4nO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogV2hldGhlciB0aGlzIGJyb3dzZXIgc3VwcG9ydHMgdGhlIGF0b2IgYW5kIGJ0b2EgZnVuY3Rpb25zLiBUaGlzIGV4dGVuc2lvblxuICAgICAqIHN0YXJ0ZWQgYXQgTW96aWxsYSBidXQgaXMgbm93IGltcGxlbWVudGVkIGJ5IG1hbnkgYnJvd3NlcnMuIFdlIHVzZSB0aGVcbiAgICAgKiBBU1NVTUVfKiB2YXJpYWJsZXMgdG8gYXZvaWQgcHVsbGluZyBpbiB0aGUgZnVsbCB1c2VyYWdlbnQgZGV0ZWN0aW9uIGxpYnJhcnlcbiAgICAgKiBidXQgc3RpbGwgYWxsb3dpbmcgdGhlIHN0YW5kYXJkIHBlci1icm93c2VyIGNvbXBpbGF0aW9ucy5cbiAgICAgKlxuICAgICAqL1xuICAgIEhBU19OQVRJVkVfU1VQUE9SVDogdHlwZW9mIGF0b2IgPT09ICdmdW5jdGlvbicsXG4gICAgLyoqXG4gICAgICogQmFzZTY0LWVuY29kZSBhbiBhcnJheSBvZiBieXRlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbnB1dCBBbiBhcnJheSBvZiBieXRlcyAobnVtYmVycyB3aXRoXG4gICAgICogICAgIHZhbHVlIGluIFswLCAyNTVdKSB0byBlbmNvZGUuXG4gICAgICogQHBhcmFtIHdlYlNhZmUgQm9vbGVhbiBpbmRpY2F0aW5nIHdlIHNob3VsZCB1c2UgdGhlXG4gICAgICogICAgIGFsdGVybmF0aXZlIGFscGhhYmV0LlxuICAgICAqIEByZXR1cm4gVGhlIGJhc2U2NCBlbmNvZGVkIHN0cmluZy5cbiAgICAgKi9cbiAgICBlbmNvZGVCeXRlQXJyYXkoaW5wdXQsIHdlYlNhZmUpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGlucHV0KSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ2VuY29kZUJ5dGVBcnJheSB0YWtlcyBhbiBhcnJheSBhcyBhIHBhcmFtZXRlcicpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5pdF8oKTtcbiAgICAgICAgY29uc3QgYnl0ZVRvQ2hhck1hcCA9IHdlYlNhZmVcbiAgICAgICAgICAgID8gdGhpcy5ieXRlVG9DaGFyTWFwV2ViU2FmZV9cbiAgICAgICAgICAgIDogdGhpcy5ieXRlVG9DaGFyTWFwXztcbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ5dGUxID0gaW5wdXRbaV07XG4gICAgICAgICAgICBjb25zdCBoYXZlQnl0ZTIgPSBpICsgMSA8IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IGJ5dGUyID0gaGF2ZUJ5dGUyID8gaW5wdXRbaSArIDFdIDogMDtcbiAgICAgICAgICAgIGNvbnN0IGhhdmVCeXRlMyA9IGkgKyAyIDwgaW5wdXQubGVuZ3RoO1xuICAgICAgICAgICAgY29uc3QgYnl0ZTMgPSBoYXZlQnl0ZTMgPyBpbnB1dFtpICsgMl0gOiAwO1xuICAgICAgICAgICAgY29uc3Qgb3V0Qnl0ZTEgPSBieXRlMSA+PiAyO1xuICAgICAgICAgICAgY29uc3Qgb3V0Qnl0ZTIgPSAoKGJ5dGUxICYgMHgwMykgPDwgNCkgfCAoYnl0ZTIgPj4gNCk7XG4gICAgICAgICAgICBsZXQgb3V0Qnl0ZTMgPSAoKGJ5dGUyICYgMHgwZikgPDwgMikgfCAoYnl0ZTMgPj4gNik7XG4gICAgICAgICAgICBsZXQgb3V0Qnl0ZTQgPSBieXRlMyAmIDB4M2Y7XG4gICAgICAgICAgICBpZiAoIWhhdmVCeXRlMykge1xuICAgICAgICAgICAgICAgIG91dEJ5dGU0ID0gNjQ7XG4gICAgICAgICAgICAgICAgaWYgKCFoYXZlQnl0ZTIpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0Qnl0ZTMgPSA2NDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXRwdXQucHVzaChieXRlVG9DaGFyTWFwW291dEJ5dGUxXSwgYnl0ZVRvQ2hhck1hcFtvdXRCeXRlMl0sIGJ5dGVUb0NoYXJNYXBbb3V0Qnl0ZTNdLCBieXRlVG9DaGFyTWFwW291dEJ5dGU0XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dHB1dC5qb2luKCcnKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEJhc2U2NC1lbmNvZGUgYSBzdHJpbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5wdXQgQSBzdHJpbmcgdG8gZW5jb2RlLlxuICAgICAqIEBwYXJhbSB3ZWJTYWZlIElmIHRydWUsIHdlIHNob3VsZCB1c2UgdGhlXG4gICAgICogICAgIGFsdGVybmF0aXZlIGFscGhhYmV0LlxuICAgICAqIEByZXR1cm4gVGhlIGJhc2U2NCBlbmNvZGVkIHN0cmluZy5cbiAgICAgKi9cbiAgICBlbmNvZGVTdHJpbmcoaW5wdXQsIHdlYlNhZmUpIHtcbiAgICAgICAgLy8gU2hvcnRjdXQgZm9yIE1vemlsbGEgYnJvd3NlcnMgdGhhdCBpbXBsZW1lbnRcbiAgICAgICAgLy8gYSBuYXRpdmUgYmFzZTY0IGVuY29kZXIgaW4gdGhlIGZvcm0gb2YgXCJidG9hL2F0b2JcIlxuICAgICAgICBpZiAodGhpcy5IQVNfTkFUSVZFX1NVUFBPUlQgJiYgIXdlYlNhZmUpIHtcbiAgICAgICAgICAgIHJldHVybiBidG9hKGlucHV0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGVCeXRlQXJyYXkoc3RyaW5nVG9CeXRlQXJyYXkkMShpbnB1dCksIHdlYlNhZmUpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQmFzZTY0LWRlY29kZSBhIHN0cmluZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbnB1dCB0byBkZWNvZGUuXG4gICAgICogQHBhcmFtIHdlYlNhZmUgVHJ1ZSBpZiB3ZSBzaG91bGQgdXNlIHRoZVxuICAgICAqICAgICBhbHRlcm5hdGl2ZSBhbHBoYWJldC5cbiAgICAgKiBAcmV0dXJuIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGRlY29kZWQgdmFsdWUuXG4gICAgICovXG4gICAgZGVjb2RlU3RyaW5nKGlucHV0LCB3ZWJTYWZlKSB7XG4gICAgICAgIC8vIFNob3J0Y3V0IGZvciBNb3ppbGxhIGJyb3dzZXJzIHRoYXQgaW1wbGVtZW50XG4gICAgICAgIC8vIGEgbmF0aXZlIGJhc2U2NCBlbmNvZGVyIGluIHRoZSBmb3JtIG9mIFwiYnRvYS9hdG9iXCJcbiAgICAgICAgaWYgKHRoaXMuSEFTX05BVElWRV9TVVBQT1JUICYmICF3ZWJTYWZlKSB7XG4gICAgICAgICAgICByZXR1cm4gYXRvYihpbnB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJ5dGVBcnJheVRvU3RyaW5nKHRoaXMuZGVjb2RlU3RyaW5nVG9CeXRlQXJyYXkoaW5wdXQsIHdlYlNhZmUpKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEJhc2U2NC1kZWNvZGUgYSBzdHJpbmcuXG4gICAgICpcbiAgICAgKiBJbiBiYXNlLTY0IGRlY29kaW5nLCBncm91cHMgb2YgZm91ciBjaGFyYWN0ZXJzIGFyZSBjb252ZXJ0ZWQgaW50byB0aHJlZVxuICAgICAqIGJ5dGVzLiAgSWYgdGhlIGVuY29kZXIgZGlkIG5vdCBhcHBseSBwYWRkaW5nLCB0aGUgaW5wdXQgbGVuZ3RoIG1heSBub3RcbiAgICAgKiBiZSBhIG11bHRpcGxlIG9mIDQuXG4gICAgICpcbiAgICAgKiBJbiB0aGlzIGNhc2UsIHRoZSBsYXN0IGdyb3VwIHdpbGwgaGF2ZSBmZXdlciB0aGFuIDQgY2hhcmFjdGVycywgYW5kXG4gICAgICogcGFkZGluZyB3aWxsIGJlIGluZmVycmVkLiAgSWYgdGhlIGdyb3VwIGhhcyBvbmUgb3IgdHdvIGNoYXJhY3RlcnMsIGl0IGRlY29kZXNcbiAgICAgKiB0byBvbmUgYnl0ZS4gIElmIHRoZSBncm91cCBoYXMgdGhyZWUgY2hhcmFjdGVycywgaXQgZGVjb2RlcyB0byB0d28gYnl0ZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5wdXQgSW5wdXQgdG8gZGVjb2RlLlxuICAgICAqIEBwYXJhbSB3ZWJTYWZlIFRydWUgaWYgd2Ugc2hvdWxkIHVzZSB0aGUgd2ViLXNhZmUgYWxwaGFiZXQuXG4gICAgICogQHJldHVybiBieXRlcyByZXByZXNlbnRpbmcgdGhlIGRlY29kZWQgdmFsdWUuXG4gICAgICovXG4gICAgZGVjb2RlU3RyaW5nVG9CeXRlQXJyYXkoaW5wdXQsIHdlYlNhZmUpIHtcbiAgICAgICAgdGhpcy5pbml0XygpO1xuICAgICAgICBjb25zdCBjaGFyVG9CeXRlTWFwID0gd2ViU2FmZVxuICAgICAgICAgICAgPyB0aGlzLmNoYXJUb0J5dGVNYXBXZWJTYWZlX1xuICAgICAgICAgICAgOiB0aGlzLmNoYXJUb0J5dGVNYXBfO1xuICAgICAgICBjb25zdCBvdXRwdXQgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7KSB7XG4gICAgICAgICAgICBjb25zdCBieXRlMSA9IGNoYXJUb0J5dGVNYXBbaW5wdXQuY2hhckF0KGkrKyldO1xuICAgICAgICAgICAgY29uc3QgaGF2ZUJ5dGUyID0gaSA8IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IGJ5dGUyID0gaGF2ZUJ5dGUyID8gY2hhclRvQnl0ZU1hcFtpbnB1dC5jaGFyQXQoaSldIDogMDtcbiAgICAgICAgICAgICsraTtcbiAgICAgICAgICAgIGNvbnN0IGhhdmVCeXRlMyA9IGkgPCBpbnB1dC5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCBieXRlMyA9IGhhdmVCeXRlMyA/IGNoYXJUb0J5dGVNYXBbaW5wdXQuY2hhckF0KGkpXSA6IDY0O1xuICAgICAgICAgICAgKytpO1xuICAgICAgICAgICAgY29uc3QgaGF2ZUJ5dGU0ID0gaSA8IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IGJ5dGU0ID0gaGF2ZUJ5dGU0ID8gY2hhclRvQnl0ZU1hcFtpbnB1dC5jaGFyQXQoaSldIDogNjQ7XG4gICAgICAgICAgICArK2k7XG4gICAgICAgICAgICBpZiAoYnl0ZTEgPT0gbnVsbCB8fCBieXRlMiA9PSBudWxsIHx8IGJ5dGUzID09IG51bGwgfHwgYnl0ZTQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBEZWNvZGVCYXNlNjRTdHJpbmdFcnJvcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgb3V0Qnl0ZTEgPSAoYnl0ZTEgPDwgMikgfCAoYnl0ZTIgPj4gNCk7XG4gICAgICAgICAgICBvdXRwdXQucHVzaChvdXRCeXRlMSk7XG4gICAgICAgICAgICBpZiAoYnl0ZTMgIT09IDY0KSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3V0Qnl0ZTIgPSAoKGJ5dGUyIDw8IDQpICYgMHhmMCkgfCAoYnl0ZTMgPj4gMik7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2gob3V0Qnl0ZTIpO1xuICAgICAgICAgICAgICAgIGlmIChieXRlNCAhPT0gNjQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0Qnl0ZTMgPSAoKGJ5dGUzIDw8IDYpICYgMHhjMCkgfCBieXRlNDtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2gob3V0Qnl0ZTMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogTGF6eSBzdGF0aWMgaW5pdGlhbGl6YXRpb24gZnVuY3Rpb24uIENhbGxlZCBiZWZvcmVcbiAgICAgKiBhY2Nlc3NpbmcgYW55IG9mIHRoZSBzdGF0aWMgbWFwIHZhcmlhYmxlcy5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGluaXRfKCkge1xuICAgICAgICBpZiAoIXRoaXMuYnl0ZVRvQ2hhck1hcF8pIHtcbiAgICAgICAgICAgIHRoaXMuYnl0ZVRvQ2hhck1hcF8gPSB7fTtcbiAgICAgICAgICAgIHRoaXMuY2hhclRvQnl0ZU1hcF8gPSB7fTtcbiAgICAgICAgICAgIHRoaXMuYnl0ZVRvQ2hhck1hcFdlYlNhZmVfID0ge307XG4gICAgICAgICAgICB0aGlzLmNoYXJUb0J5dGVNYXBXZWJTYWZlXyA9IHt9O1xuICAgICAgICAgICAgLy8gV2Ugd2FudCBxdWljayBtYXBwaW5ncyBiYWNrIGFuZCBmb3J0aCwgc28gd2UgcHJlY29tcHV0ZSB0d28gbWFwcy5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5FTkNPREVEX1ZBTFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJ5dGVUb0NoYXJNYXBfW2ldID0gdGhpcy5FTkNPREVEX1ZBTFMuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hhclRvQnl0ZU1hcF9bdGhpcy5ieXRlVG9DaGFyTWFwX1tpXV0gPSBpO1xuICAgICAgICAgICAgICAgIHRoaXMuYnl0ZVRvQ2hhck1hcFdlYlNhZmVfW2ldID0gdGhpcy5FTkNPREVEX1ZBTFNfV0VCU0FGRS5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGFyVG9CeXRlTWFwV2ViU2FmZV9bdGhpcy5ieXRlVG9DaGFyTWFwV2ViU2FmZV9baV1dID0gaTtcbiAgICAgICAgICAgICAgICAvLyBCZSBmb3JnaXZpbmcgd2hlbiBkZWNvZGluZyBhbmQgY29ycmVjdGx5IGRlY29kZSBib3RoIGVuY29kaW5ncy5cbiAgICAgICAgICAgICAgICBpZiAoaSA+PSB0aGlzLkVOQ09ERURfVkFMU19CQVNFLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYXJUb0J5dGVNYXBfW3RoaXMuRU5DT0RFRF9WQUxTX1dFQlNBRkUuY2hhckF0KGkpXSA9IGk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hhclRvQnl0ZU1hcFdlYlNhZmVfW3RoaXMuRU5DT0RFRF9WQUxTLmNoYXJBdChpKV0gPSBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4vKipcbiAqIEFuIGVycm9yIGVuY291bnRlcmVkIHdoaWxlIGRlY29kaW5nIGJhc2U2NCBzdHJpbmcuXG4gKi9cbmNsYXNzIERlY29kZUJhc2U2NFN0cmluZ0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICB0aGlzLm5hbWUgPSAnRGVjb2RlQmFzZTY0U3RyaW5nRXJyb3InO1xuICAgIH1cbn1cbi8qKlxuICogVVJMLXNhZmUgYmFzZTY0IGVuY29kaW5nXG4gKi9cbmNvbnN0IGJhc2U2NEVuY29kZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICBjb25zdCB1dGY4Qnl0ZXMgPSBzdHJpbmdUb0J5dGVBcnJheSQxKHN0cik7XG4gICAgcmV0dXJuIGJhc2U2NC5lbmNvZGVCeXRlQXJyYXkodXRmOEJ5dGVzLCB0cnVlKTtcbn07XG4vKipcbiAqIFVSTC1zYWZlIGJhc2U2NCBlbmNvZGluZyAod2l0aG91dCBcIi5cIiBwYWRkaW5nIGluIHRoZSBlbmQpLlxuICogZS5nLiBVc2VkIGluIEpTT04gV2ViIFRva2VuIChKV1QpIHBhcnRzLlxuICovXG5jb25zdCBiYXNlNjR1cmxFbmNvZGVXaXRob3V0UGFkZGluZyA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAvLyBVc2UgYmFzZTY0dXJsIGVuY29kaW5nIGFuZCByZW1vdmUgcGFkZGluZyBpbiB0aGUgZW5kIChkb3QgY2hhcmFjdGVycykuXG4gICAgcmV0dXJuIGJhc2U2NEVuY29kZShzdHIpLnJlcGxhY2UoL1xcLi9nLCAnJyk7XG59O1xuLyoqXG4gKiBVUkwtc2FmZSBiYXNlNjQgZGVjb2RpbmdcbiAqXG4gKiBOT1RFOiBETyBOT1QgdXNlIHRoZSBnbG9iYWwgYXRvYigpIGZ1bmN0aW9uIC0gaXQgZG9lcyBOT1Qgc3VwcG9ydCB0aGVcbiAqIGJhc2U2NFVybCB2YXJpYW50IGVuY29kaW5nLlxuICpcbiAqIEBwYXJhbSBzdHIgVG8gYmUgZGVjb2RlZFxuICogQHJldHVybiBEZWNvZGVkIHJlc3VsdCwgaWYgcG9zc2libGVcbiAqL1xuY29uc3QgYmFzZTY0RGVjb2RlID0gZnVuY3Rpb24gKHN0cikge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBiYXNlNjQuZGVjb2RlU3RyaW5nKHN0ciwgdHJ1ZSk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Jhc2U2NERlY29kZSBmYWlsZWQ6ICcsIGUpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIERvIGEgZGVlcC1jb3B5IG9mIGJhc2ljIEphdmFTY3JpcHQgT2JqZWN0cyBvciBBcnJheXMuXG4gKi9cbmZ1bmN0aW9uIGRlZXBDb3B5KHZhbHVlKSB7XG4gICAgcmV0dXJuIGRlZXBFeHRlbmQodW5kZWZpbmVkLCB2YWx1ZSk7XG59XG4vKipcbiAqIENvcHkgcHJvcGVydGllcyBmcm9tIHNvdXJjZSB0byB0YXJnZXQgKHJlY3Vyc2l2ZWx5IGFsbG93cyBleHRlbnNpb25cbiAqIG9mIE9iamVjdHMgYW5kIEFycmF5cykuICBTY2FsYXIgdmFsdWVzIGluIHRoZSB0YXJnZXQgYXJlIG92ZXItd3JpdHRlbi5cbiAqIElmIHRhcmdldCBpcyB1bmRlZmluZWQsIGFuIG9iamVjdCBvZiB0aGUgYXBwcm9wcmlhdGUgdHlwZSB3aWxsIGJlIGNyZWF0ZWRcbiAqIChhbmQgcmV0dXJuZWQpLlxuICpcbiAqIFdlIHJlY3Vyc2l2ZWx5IGNvcHkgYWxsIGNoaWxkIHByb3BlcnRpZXMgb2YgcGxhaW4gT2JqZWN0cyBpbiB0aGUgc291cmNlLSBzb1xuICogdGhhdCBuYW1lc3BhY2UtIGxpa2UgZGljdGlvbmFyaWVzIGFyZSBtZXJnZWQuXG4gKlxuICogTm90ZSB0aGF0IHRoZSB0YXJnZXQgY2FuIGJlIGEgZnVuY3Rpb24sIGluIHdoaWNoIGNhc2UgdGhlIHByb3BlcnRpZXMgaW5cbiAqIHRoZSBzb3VyY2UgT2JqZWN0IGFyZSBjb3BpZWQgb250byBpdCBhcyBzdGF0aWMgcHJvcGVydGllcyBvZiB0aGUgRnVuY3Rpb24uXG4gKlxuICogTm90ZTogd2UgZG9uJ3QgbWVyZ2UgX19wcm90b19fIHRvIHByZXZlbnQgcHJvdG90eXBlIHBvbGx1dGlvblxuICovXG5mdW5jdGlvbiBkZWVwRXh0ZW5kKHRhcmdldCwgc291cmNlKSB7XG4gICAgaWYgKCEoc291cmNlIGluc3RhbmNlb2YgT2JqZWN0KSkge1xuICAgICAgICByZXR1cm4gc291cmNlO1xuICAgIH1cbiAgICBzd2l0Y2ggKHNvdXJjZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICBjYXNlIERhdGU6XG4gICAgICAgICAgICAvLyBUcmVhdCBEYXRlcyBsaWtlIHNjYWxhcnM7IGlmIHRoZSB0YXJnZXQgZGF0ZSBvYmplY3QgaGFkIGFueSBjaGlsZFxuICAgICAgICAgICAgLy8gcHJvcGVydGllcyAtIHRoZXkgd2lsbCBiZSBsb3N0IVxuICAgICAgICAgICAgY29uc3QgZGF0ZVZhbHVlID0gc291cmNlO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKGRhdGVWYWx1ZS5nZXRUaW1lKCkpO1xuICAgICAgICBjYXNlIE9iamVjdDpcbiAgICAgICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgQXJyYXk6XG4gICAgICAgICAgICAvLyBBbHdheXMgY29weSB0aGUgYXJyYXkgc291cmNlIGFuZCBvdmVyd3JpdGUgdGhlIHRhcmdldC5cbiAgICAgICAgICAgIHRhcmdldCA9IFtdO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBOb3QgYSBwbGFpbiBPYmplY3QgLSB0cmVhdCBpdCBhcyBhIHNjYWxhci5cbiAgICAgICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgLy8gdXNlIGlzVmFsaWRLZXkgdG8gZ3VhcmQgYWdhaW5zdCBwcm90b3R5cGUgcG9sbHV0aW9uLiBTZWUgaHR0cHM6Ly9zbnlrLmlvL3Z1bG4vU05ZSy1KUy1MT0RBU0gtNDUwMjAyXG4gICAgICAgIGlmICghc291cmNlLmhhc093blByb3BlcnR5KHByb3ApIHx8ICFpc1ZhbGlkS2V5KHByb3ApKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0YXJnZXRbcHJvcF0gPSBkZWVwRXh0ZW5kKHRhcmdldFtwcm9wXSwgc291cmNlW3Byb3BdKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cbmZ1bmN0aW9uIGlzVmFsaWRLZXkoa2V5KSB7XG4gICAgcmV0dXJuIGtleSAhPT0gJ19fcHJvdG9fXyc7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIyIEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIFBvbHlmaWxsIGZvciBgZ2xvYmFsVGhpc2Agb2JqZWN0LlxuICogQHJldHVybnMgdGhlIGBnbG9iYWxUaGlzYCBvYmplY3QgZm9yIHRoZSBnaXZlbiBlbnZpcm9ubWVudC5cbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gZ2V0R2xvYmFsKCkge1xuICAgIGlmICh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gd2luZG93O1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGdsb2JhbDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gbG9jYXRlIGdsb2JhbCBvYmplY3QuJyk7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIyIEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5jb25zdCBnZXREZWZhdWx0c0Zyb21HbG9iYWwgPSAoKSA9PiBnZXRHbG9iYWwoKS5fX0ZJUkVCQVNFX0RFRkFVTFRTX187XG4vKipcbiAqIEF0dGVtcHQgdG8gcmVhZCBkZWZhdWx0cyBmcm9tIGEgSlNPTiBzdHJpbmcgcHJvdmlkZWQgdG9cbiAqIHByb2Nlc3MoLillbnYoLilfX0ZJUkVCQVNFX0RFRkFVTFRTX18gb3IgYSBKU09OIGZpbGUgd2hvc2UgcGF0aCBpcyBpblxuICogcHJvY2VzcyguKWVudiguKV9fRklSRUJBU0VfREVGQVVMVFNfUEFUSF9fXG4gKiBUaGUgZG90cyBhcmUgaW4gcGFyZW5zIGJlY2F1c2UgY2VydGFpbiBjb21waWxlcnMgKFZpdGU/KSBjYW5ub3RcbiAqIGhhbmRsZSBzZWVpbmcgdGhhdCB2YXJpYWJsZSBpbiBjb21tZW50cy5cbiAqIFNlZSBodHRwczovL2dpdGh1Yi5jb20vZmlyZWJhc2UvZmlyZWJhc2UtanMtc2RrL2lzc3Vlcy82ODM4XG4gKi9cbmNvbnN0IGdldERlZmF1bHRzRnJvbUVudlZhcmlhYmxlID0gKCkgPT4ge1xuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIHByb2Nlc3MuZW52ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGRlZmF1bHRzSnNvblN0cmluZyA9IHByb2Nlc3MuZW52Ll9fRklSRUJBU0VfREVGQVVMVFNfXztcbiAgICBpZiAoZGVmYXVsdHNKc29uU3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRlZmF1bHRzSnNvblN0cmluZyk7XG4gICAgfVxufTtcbmNvbnN0IGdldERlZmF1bHRzRnJvbUNvb2tpZSA9ICgpID0+IHtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGxldCBtYXRjaDtcbiAgICB0cnkge1xuICAgICAgICBtYXRjaCA9IGRvY3VtZW50LmNvb2tpZS5tYXRjaCgvX19GSVJFQkFTRV9ERUZBVUxUU19fPShbXjtdKykvKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gU29tZSBlbnZpcm9ubWVudHMgc3VjaCBhcyBBbmd1bGFyIFVuaXZlcnNhbCBTU1IgaGF2ZSBhXG4gICAgICAgIC8vIGBkb2N1bWVudGAgb2JqZWN0IGJ1dCBlcnJvciBvbiBhY2Nlc3NpbmcgYGRvY3VtZW50LmNvb2tpZWAuXG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZGVjb2RlZCA9IG1hdGNoICYmIGJhc2U2NERlY29kZShtYXRjaFsxXSk7XG4gICAgcmV0dXJuIGRlY29kZWQgJiYgSlNPTi5wYXJzZShkZWNvZGVkKTtcbn07XG4vKipcbiAqIEdldCB0aGUgX19GSVJFQkFTRV9ERUZBVUxUU19fIG9iamVjdC4gSXQgY2hlY2tzIGluIG9yZGVyOlxuICogKDEpIGlmIHN1Y2ggYW4gb2JqZWN0IGV4aXN0cyBhcyBhIHByb3BlcnR5IG9mIGBnbG9iYWxUaGlzYFxuICogKDIpIGlmIHN1Y2ggYW4gb2JqZWN0IHdhcyBwcm92aWRlZCBvbiBhIHNoZWxsIGVudmlyb25tZW50IHZhcmlhYmxlXG4gKiAoMykgaWYgc3VjaCBhbiBvYmplY3QgZXhpc3RzIGluIGEgY29va2llXG4gKiBAcHVibGljXG4gKi9cbmNvbnN0IGdldERlZmF1bHRzID0gKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiAoZ2V0RGVmYXVsdHNGcm9tUG9zdGluc3RhbGwoKSB8fFxuICAgICAgICAgICAgZ2V0RGVmYXVsdHNGcm9tR2xvYmFsKCkgfHxcbiAgICAgICAgICAgIGdldERlZmF1bHRzRnJvbUVudlZhcmlhYmxlKCkgfHxcbiAgICAgICAgICAgIGdldERlZmF1bHRzRnJvbUNvb2tpZSgpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhdGNoLWFsbCBmb3IgYmVpbmcgdW5hYmxlIHRvIGdldCBfX0ZJUkVCQVNFX0RFRkFVTFRTX18gZHVlXG4gICAgICAgICAqIHRvIGFueSBlbnZpcm9ubWVudCBjYXNlIHdlIGhhdmUgbm90IGFjY291bnRlZCBmb3IuIExvZyB0b1xuICAgICAgICAgKiBpbmZvIGluc3RlYWQgb2Ygc3dhbGxvd2luZyBzbyB3ZSBjYW4gZmluZCB0aGVzZSB1bmtub3duIGNhc2VzXG4gICAgICAgICAqIGFuZCBhZGQgcGF0aHMgZm9yIHRoZW0gaWYgbmVlZGVkLlxuICAgICAgICAgKi9cbiAgICAgICAgY29uc29sZS5pbmZvKGBVbmFibGUgdG8gZ2V0IF9fRklSRUJBU0VfREVGQVVMVFNfXyBkdWUgdG86ICR7ZX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbn07XG4vKipcbiAqIFJldHVybnMgZW11bGF0b3IgaG9zdCBzdG9yZWQgaW4gdGhlIF9fRklSRUJBU0VfREVGQVVMVFNfXyBvYmplY3RcbiAqIGZvciB0aGUgZ2l2ZW4gcHJvZHVjdC5cbiAqIEByZXR1cm5zIGEgVVJMIGhvc3QgZm9ybWF0dGVkIGxpa2UgYDEyNy4wLjAuMTo5OTk5YCBvciBgWzo6MV06NDAwMGAgaWYgYXZhaWxhYmxlXG4gKiBAcHVibGljXG4gKi9cbmNvbnN0IGdldERlZmF1bHRFbXVsYXRvckhvc3QgPSAocHJvZHVjdE5hbWUpID0+IGdldERlZmF1bHRzKCk/LmVtdWxhdG9ySG9zdHM/Lltwcm9kdWN0TmFtZV07XG4vKipcbiAqIFJldHVybnMgZW11bGF0b3IgaG9zdG5hbWUgYW5kIHBvcnQgc3RvcmVkIGluIHRoZSBfX0ZJUkVCQVNFX0RFRkFVTFRTX18gb2JqZWN0XG4gKiBmb3IgdGhlIGdpdmVuIHByb2R1Y3QuXG4gKiBAcmV0dXJucyBhIHBhaXIgb2YgaG9zdG5hbWUgYW5kIHBvcnQgbGlrZSBgW1wiOjoxXCIsIDQwMDBdYCBpZiBhdmFpbGFibGVcbiAqIEBwdWJsaWNcbiAqL1xuY29uc3QgZ2V0RGVmYXVsdEVtdWxhdG9ySG9zdG5hbWVBbmRQb3J0ID0gKHByb2R1Y3ROYW1lKSA9PiB7XG4gICAgY29uc3QgaG9zdCA9IGdldERlZmF1bHRFbXVsYXRvckhvc3QocHJvZHVjdE5hbWUpO1xuICAgIGlmICghaG9zdCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBzZXBhcmF0b3JJbmRleCA9IGhvc3QubGFzdEluZGV4T2YoJzonKTsgLy8gRmluZGluZyB0aGUgbGFzdCBzaW5jZSBJUHY2IGFkZHIgYWxzbyBoYXMgY29sb25zLlxuICAgIGlmIChzZXBhcmF0b3JJbmRleCA8PSAwIHx8IHNlcGFyYXRvckluZGV4ICsgMSA9PT0gaG9zdC5sZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGhvc3QgJHtob3N0fSB3aXRoIG5vIHNlcGFyYXRlIGhvc3RuYW1lIGFuZCBwb3J0IWApO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcmVzdHJpY3RlZC1nbG9iYWxzXG4gICAgY29uc3QgcG9ydCA9IHBhcnNlSW50KGhvc3Quc3Vic3RyaW5nKHNlcGFyYXRvckluZGV4ICsgMSksIDEwKTtcbiAgICBpZiAoaG9zdFswXSA9PT0gJ1snKSB7XG4gICAgICAgIC8vIEJyYWNrZXQtcXVvdGVkIGBbaXB2NmFkZHJdOnBvcnRgID0+IHJldHVybiBcImlwdjZhZGRyXCIgKHdpdGhvdXQgYnJhY2tldHMpLlxuICAgICAgICByZXR1cm4gW2hvc3Quc3Vic3RyaW5nKDEsIHNlcGFyYXRvckluZGV4IC0gMSksIHBvcnRdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFtob3N0LnN1YnN0cmluZygwLCBzZXBhcmF0b3JJbmRleCksIHBvcnRdO1xuICAgIH1cbn07XG4vKipcbiAqIFJldHVybnMgRmlyZWJhc2UgYXBwIGNvbmZpZyBzdG9yZWQgaW4gdGhlIF9fRklSRUJBU0VfREVGQVVMVFNfXyBvYmplY3QuXG4gKiBAcHVibGljXG4gKi9cbmNvbnN0IGdldERlZmF1bHRBcHBDb25maWcgPSAoKSA9PiBnZXREZWZhdWx0cygpPy5jb25maWc7XG4vKipcbiAqIFJldHVybnMgYW4gZXhwZXJpbWVudGFsIHNldHRpbmcgb24gdGhlIF9fRklSRUJBU0VfREVGQVVMVFNfXyBvYmplY3QgKHByb3BlcnRpZXNcbiAqIHByZWZpeGVkIGJ5IFwiX1wiKVxuICogQHB1YmxpY1xuICovXG5jb25zdCBnZXRFeHBlcmltZW50YWxTZXR0aW5nID0gKG5hbWUpID0+IGdldERlZmF1bHRzKCk/LltgXyR7bmFtZX1gXTtcblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmNsYXNzIERlZmVycmVkIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5yZWplY3QgPSAoKSA9PiB7IH07XG4gICAgICAgIHRoaXMucmVzb2x2ZSA9ICgpID0+IHsgfTtcbiAgICAgICAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgICAgIHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogT3VyIEFQSSBpbnRlcm5hbHMgYXJlIG5vdCBwcm9taXNpZmllZCBhbmQgY2Fubm90IGJlY2F1c2Ugb3VyIGNhbGxiYWNrIEFQSXMgaGF2ZSBzdWJ0bGUgZXhwZWN0YXRpb25zIGFyb3VuZFxuICAgICAqIGludm9raW5nIHByb21pc2VzIGlubGluZSwgd2hpY2ggUHJvbWlzZXMgYXJlIGZvcmJpZGRlbiB0byBkby4gVGhpcyBtZXRob2QgYWNjZXB0cyBhbiBvcHRpb25hbCBub2RlLXN0eWxlIGNhbGxiYWNrXG4gICAgICogYW5kIHJldHVybnMgYSBub2RlLXN0eWxlIGNhbGxiYWNrIHdoaWNoIHdpbGwgcmVzb2x2ZSBvciByZWplY3QgdGhlIERlZmVycmVkJ3MgcHJvbWlzZS5cbiAgICAgKi9cbiAgICB3cmFwQ2FsbGJhY2soY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIChlcnJvciwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHRoaXMucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzb2x2ZSh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgLy8gQXR0YWNoaW5nIG5vb3AgaGFuZGxlciBqdXN0IGluIGNhc2UgZGV2ZWxvcGVyIHdhc24ndCBleHBlY3RpbmdcbiAgICAgICAgICAgICAgICAvLyBwcm9taXNlc1xuICAgICAgICAgICAgICAgIHRoaXMucHJvbWlzZS5jYXRjaCgoKSA9PiB7IH0pO1xuICAgICAgICAgICAgICAgIC8vIFNvbWUgb2Ygb3VyIGNhbGxiYWNrcyBkb24ndCBleHBlY3QgYSB2YWx1ZSBhbmQgb3VyIG93biB0ZXN0c1xuICAgICAgICAgICAgICAgIC8vIGFzc2VydCB0aGF0IHRoZSBwYXJhbWV0ZXIgbGVuZ3RoIGlzIDFcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2subGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjUgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgaG9zdCBpcyBhIGNsb3VkIHdvcmtzdGF0aW9uIG9yIG5vdC5cbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gaXNDbG91ZFdvcmtzdGF0aW9uKHVybCkge1xuICAgIC8vIGBpc0Nsb3VkV29ya3N0YXRpb25gIGlzIGNhbGxlZCB3aXRob3V0IHByb3RvY29sIGluIGNlcnRhaW4gY29ubmVjdCpFbXVsYXRvciBmdW5jdGlvbnNcbiAgICAvLyBJbiBIVFRQIHJlcXVlc3QgYnVpbGRlcnMsIGl0J3MgY2FsbGVkIHdpdGggdGhlIHByb3RvY29sLlxuICAgIC8vIElmIGNhbGxlZCB3aXRoIHByb3RvY29sIHByZWZpeCwgaXQncyBhIHZhbGlkIFVSTCwgc28gd2UgZXh0cmFjdCB0aGUgaG9zdG5hbWVcbiAgICAvLyBJZiBjYWxsZWQgd2l0aG91dCwgd2UgYXNzdW1lIHRoZSBzdHJpbmcgaXMgdGhlIGhvc3RuYW1lLlxuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGhvc3QgPSB1cmwuc3RhcnRzV2l0aCgnaHR0cDovLycpIHx8IHVybC5zdGFydHNXaXRoKCdodHRwczovLycpXG4gICAgICAgICAgICA/IG5ldyBVUkwodXJsKS5ob3N0bmFtZVxuICAgICAgICAgICAgOiB1cmw7XG4gICAgICAgIHJldHVybiBob3N0LmVuZHNXaXRoKCcuY2xvdWR3b3Jrc3RhdGlvbnMuZGV2Jyk7XG4gICAgfVxuICAgIGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cbi8qKlxuICogTWFrZXMgYSBmZXRjaCByZXF1ZXN0IHRvIHRoZSBnaXZlbiBzZXJ2ZXIuXG4gKiBNb3N0bHkgdXNlZCBmb3IgZm9yd2FyZGluZyBjb29raWVzIGluIEZpcmViYXNlIFN0dWRpby5cbiAqIEBwdWJsaWNcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcGluZ1NlcnZlcihlbmRwb2ludCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZldGNoKGVuZHBvaW50LCB7XG4gICAgICAgIGNyZWRlbnRpYWxzOiAnaW5jbHVkZSdcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0Lm9rO1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlTW9ja1VzZXJUb2tlbih0b2tlbiwgcHJvamVjdElkKSB7XG4gICAgaWYgKHRva2VuLnVpZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBcInVpZFwiIGZpZWxkIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQgYnkgbW9ja1VzZXJUb2tlbi4gUGxlYXNlIHVzZSBcInN1YlwiIGluc3RlYWQgZm9yIEZpcmViYXNlIEF1dGggVXNlciBJRC4nKTtcbiAgICB9XG4gICAgLy8gVW5zZWN1cmVkIEpXVHMgdXNlIFwibm9uZVwiIGFzIHRoZSBhbGdvcml0aG0uXG4gICAgY29uc3QgaGVhZGVyID0ge1xuICAgICAgICBhbGc6ICdub25lJyxcbiAgICAgICAgdHlwZTogJ0pXVCdcbiAgICB9O1xuICAgIGNvbnN0IHByb2plY3QgPSBwcm9qZWN0SWQgfHwgJ2RlbW8tcHJvamVjdCc7XG4gICAgY29uc3QgaWF0ID0gdG9rZW4uaWF0IHx8IDA7XG4gICAgY29uc3Qgc3ViID0gdG9rZW4uc3ViIHx8IHRva2VuLnVzZXJfaWQ7XG4gICAgaWYgKCFzdWIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibW9ja1VzZXJUb2tlbiBtdXN0IGNvbnRhaW4gJ3N1Yicgb3IgJ3VzZXJfaWQnIGZpZWxkIVwiKTtcbiAgICB9XG4gICAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICAgICAgLy8gU2V0IGFsbCByZXF1aXJlZCBmaWVsZHMgdG8gZGVjZW50IGRlZmF1bHRzXG4gICAgICAgIGlzczogYGh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS8ke3Byb2plY3R9YCxcbiAgICAgICAgYXVkOiBwcm9qZWN0LFxuICAgICAgICBpYXQsXG4gICAgICAgIGV4cDogaWF0ICsgMzYwMCxcbiAgICAgICAgYXV0aF90aW1lOiBpYXQsXG4gICAgICAgIHN1YixcbiAgICAgICAgdXNlcl9pZDogc3ViLFxuICAgICAgICBmaXJlYmFzZToge1xuICAgICAgICAgICAgc2lnbl9pbl9wcm92aWRlcjogJ2N1c3RvbScsXG4gICAgICAgICAgICBpZGVudGl0aWVzOiB7fVxuICAgICAgICB9LFxuICAgICAgICAvLyBPdmVycmlkZSB3aXRoIHVzZXIgb3B0aW9uc1xuICAgICAgICAuLi50b2tlblxuICAgIH07XG4gICAgLy8gVW5zZWN1cmVkIEpXVHMgdXNlIHRoZSBlbXB0eSBzdHJpbmcgYXMgYSBzaWduYXR1cmUuXG4gICAgY29uc3Qgc2lnbmF0dXJlID0gJyc7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgYmFzZTY0dXJsRW5jb2RlV2l0aG91dFBhZGRpbmcoSlNPTi5zdHJpbmdpZnkoaGVhZGVyKSksXG4gICAgICAgIGJhc2U2NHVybEVuY29kZVdpdGhvdXRQYWRkaW5nKEpTT04uc3RyaW5naWZ5KHBheWxvYWQpKSxcbiAgICAgICAgc2lnbmF0dXJlXG4gICAgXS5qb2luKCcuJyk7XG59XG5jb25zdCBlbXVsYXRvclN0YXR1cyA9IHt9O1xuLy8gQ2hlY2tzIHdoZXRoZXIgYW55IHByb2R1Y3RzIGFyZSBydW5uaW5nIG9uIGFuIGVtdWxhdG9yXG5mdW5jdGlvbiBnZXRFbXVsYXRvclN1bW1hcnkoKSB7XG4gICAgY29uc3Qgc3VtbWFyeSA9IHtcbiAgICAgICAgcHJvZDogW10sXG4gICAgICAgIGVtdWxhdG9yOiBbXVxuICAgIH07XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZW11bGF0b3JTdGF0dXMpKSB7XG4gICAgICAgIGlmIChlbXVsYXRvclN0YXR1c1trZXldKSB7XG4gICAgICAgICAgICBzdW1tYXJ5LmVtdWxhdG9yLnB1c2goa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN1bW1hcnkucHJvZC5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1bW1hcnk7XG59XG5mdW5jdGlvbiBnZXRPckNyZWF0ZUVsKGlkKSB7XG4gICAgbGV0IHBhcmVudERpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICBsZXQgY3JlYXRlZCA9IGZhbHNlO1xuICAgIGlmICghcGFyZW50RGl2KSB7XG4gICAgICAgIHBhcmVudERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBwYXJlbnREaXYuc2V0QXR0cmlidXRlKCdpZCcsIGlkKTtcbiAgICAgICAgY3JlYXRlZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiB7IGNyZWF0ZWQsIGVsZW1lbnQ6IHBhcmVudERpdiB9O1xufVxubGV0IHByZXZpb3VzbHlEaXNtaXNzZWQgPSBmYWxzZTtcbi8qKlxuICogVXBkYXRlcyBFbXVsYXRvciBCYW5uZXIuIFByaW1hcmlseSB1c2VkIGZvciBGaXJlYmFzZSBTdHVkaW9cbiAqIEBwYXJhbSBuYW1lXG4gKiBAcGFyYW0gaXNSdW5uaW5nRW11bGF0b3JcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gdXBkYXRlRW11bGF0b3JCYW5uZXIobmFtZSwgaXNSdW5uaW5nRW11bGF0b3IpIHtcbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHxcbiAgICAgICAgdHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICAhaXNDbG91ZFdvcmtzdGF0aW9uKHdpbmRvdy5sb2NhdGlvbi5ob3N0KSB8fFxuICAgICAgICBlbXVsYXRvclN0YXR1c1tuYW1lXSA9PT0gaXNSdW5uaW5nRW11bGF0b3IgfHxcbiAgICAgICAgZW11bGF0b3JTdGF0dXNbbmFtZV0gfHwgLy8gSWYgYWxyZWFkeSBzZXQgdG8gdXNlIGVtdWxhdG9yLCBjYW4ndCBnbyBiYWNrIHRvIHByb2QuXG4gICAgICAgIHByZXZpb3VzbHlEaXNtaXNzZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlbXVsYXRvclN0YXR1c1tuYW1lXSA9IGlzUnVubmluZ0VtdWxhdG9yO1xuICAgIGZ1bmN0aW9uIHByZWZpeGVkSWQoaWQpIHtcbiAgICAgICAgcmV0dXJuIGBfX2ZpcmViYXNlX19iYW5uZXJfXyR7aWR9YDtcbiAgICB9XG4gICAgY29uc3QgYmFubmVySWQgPSAnX19maXJlYmFzZV9fYmFubmVyJztcbiAgICBjb25zdCBzdW1tYXJ5ID0gZ2V0RW11bGF0b3JTdW1tYXJ5KCk7XG4gICAgY29uc3Qgc2hvd0Vycm9yID0gc3VtbWFyeS5wcm9kLmxlbmd0aCA+IDA7XG4gICAgZnVuY3Rpb24gdGVhckRvd24oKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChiYW5uZXJJZCk7XG4gICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICBlbGVtZW50LnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldHVwQmFubmVyU3R5bGVzKGJhbm5lckVsKSB7XG4gICAgICAgIGJhbm5lckVsLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgIGJhbm5lckVsLnN0eWxlLmJhY2tncm91bmQgPSAnIzdmYWFmMCc7XG4gICAgICAgIGJhbm5lckVsLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgYmFubmVyRWwuc3R5bGUuYm90dG9tID0gJzVweCc7XG4gICAgICAgIGJhbm5lckVsLnN0eWxlLmxlZnQgPSAnNXB4JztcbiAgICAgICAgYmFubmVyRWwuc3R5bGUucGFkZGluZyA9ICcuNWVtJztcbiAgICAgICAgYmFubmVyRWwuc3R5bGUuYm9yZGVyUmFkaXVzID0gJzVweCc7XG4gICAgICAgIGJhbm5lckVsLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcbiAgICB9XG4gICAgZnVuY3Rpb24gc2V0dXBJY29uU3R5bGVzKHByZXBlbmRJY29uLCBpY29uSWQpIHtcbiAgICAgICAgcHJlcGVuZEljb24uc2V0QXR0cmlidXRlKCd3aWR0aCcsICcyNCcpO1xuICAgICAgICBwcmVwZW5kSWNvbi5zZXRBdHRyaWJ1dGUoJ2lkJywgaWNvbklkKTtcbiAgICAgICAgcHJlcGVuZEljb24uc2V0QXR0cmlidXRlKCdoZWlnaHQnLCAnMjQnKTtcbiAgICAgICAgcHJlcGVuZEljb24uc2V0QXR0cmlidXRlKCd2aWV3Qm94JywgJzAgMCAyNCAyNCcpO1xuICAgICAgICBwcmVwZW5kSWNvbi5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCAnbm9uZScpO1xuICAgICAgICBwcmVwZW5kSWNvbi5zdHlsZS5tYXJnaW5MZWZ0ID0gJy02cHgnO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXR1cENsb3NlQnRuKCkge1xuICAgICAgICBjb25zdCBjbG9zZUJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgY2xvc2VCdG4uc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xuICAgICAgICBjbG9zZUJ0bi5zdHlsZS5tYXJnaW5MZWZ0ID0gJzE2cHgnO1xuICAgICAgICBjbG9zZUJ0bi5zdHlsZS5mb250U2l6ZSA9ICcyNHB4JztcbiAgICAgICAgY2xvc2VCdG4uaW5uZXJIVE1MID0gJyAmdGltZXM7JztcbiAgICAgICAgY2xvc2VCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHByZXZpb3VzbHlEaXNtaXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGVhckRvd24oKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGNsb3NlQnRuO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXR1cExpbmtTdHlsZXMobGVhcm5Nb3JlTGluaywgbGVhcm5Nb3JlSWQpIHtcbiAgICAgICAgbGVhcm5Nb3JlTGluay5zZXRBdHRyaWJ1dGUoJ2lkJywgbGVhcm5Nb3JlSWQpO1xuICAgICAgICBsZWFybk1vcmVMaW5rLmlubmVyVGV4dCA9ICdMZWFybiBtb3JlJztcbiAgICAgICAgbGVhcm5Nb3JlTGluay5ocmVmID1cbiAgICAgICAgICAgICdodHRwczovL2ZpcmViYXNlLmdvb2dsZS5jb20vZG9jcy9zdHVkaW8vcHJldmlldy1hcHBzI3ByZXZpZXctYmFja2VuZCc7XG4gICAgICAgIGxlYXJuTW9yZUxpbmsuc2V0QXR0cmlidXRlKCd0YXJnZXQnLCAnX19ibGFuaycpO1xuICAgICAgICBsZWFybk1vcmVMaW5rLnN0eWxlLnBhZGRpbmdMZWZ0ID0gJzVweCc7XG4gICAgICAgIGxlYXJuTW9yZUxpbmsuc3R5bGUudGV4dERlY29yYXRpb24gPSAndW5kZXJsaW5lJztcbiAgICB9XG4gICAgZnVuY3Rpb24gc2V0dXBEb20oKSB7XG4gICAgICAgIGNvbnN0IGJhbm5lciA9IGdldE9yQ3JlYXRlRWwoYmFubmVySWQpO1xuICAgICAgICBjb25zdCBmaXJlYmFzZVRleHRJZCA9IHByZWZpeGVkSWQoJ3RleHQnKTtcbiAgICAgICAgY29uc3QgZmlyZWJhc2VUZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZmlyZWJhc2VUZXh0SWQpIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgY29uc3QgbGVhcm5Nb3JlSWQgPSBwcmVmaXhlZElkKCdsZWFybm1vcmUnKTtcbiAgICAgICAgY29uc3QgbGVhcm5Nb3JlTGluayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGxlYXJuTW9yZUlkKSB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICBjb25zdCBwcmVwZW5kSWNvbklkID0gcHJlZml4ZWRJZCgncHJlcHJlbmRJY29uJyk7XG4gICAgICAgIGNvbnN0IHByZXBlbmRJY29uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocHJlcGVuZEljb25JZCkgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnc3ZnJyk7XG4gICAgICAgIGlmIChiYW5uZXIuY3JlYXRlZCkge1xuICAgICAgICAgICAgLy8gdXBkYXRlIHN0eWxlc1xuICAgICAgICAgICAgY29uc3QgYmFubmVyRWwgPSBiYW5uZXIuZWxlbWVudDtcbiAgICAgICAgICAgIHNldHVwQmFubmVyU3R5bGVzKGJhbm5lckVsKTtcbiAgICAgICAgICAgIHNldHVwTGlua1N0eWxlcyhsZWFybk1vcmVMaW5rLCBsZWFybk1vcmVJZCk7XG4gICAgICAgICAgICBjb25zdCBjbG9zZUJ0biA9IHNldHVwQ2xvc2VCdG4oKTtcbiAgICAgICAgICAgIHNldHVwSWNvblN0eWxlcyhwcmVwZW5kSWNvbiwgcHJlcGVuZEljb25JZCk7XG4gICAgICAgICAgICBiYW5uZXJFbC5hcHBlbmQocHJlcGVuZEljb24sIGZpcmViYXNlVGV4dCwgbGVhcm5Nb3JlTGluaywgY2xvc2VCdG4pO1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChiYW5uZXJFbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNob3dFcnJvcikge1xuICAgICAgICAgICAgZmlyZWJhc2VUZXh0LmlubmVyVGV4dCA9IGBQcmV2aWV3IGJhY2tlbmQgZGlzY29ubmVjdGVkLmA7XG4gICAgICAgICAgICBwcmVwZW5kSWNvbi5pbm5lckhUTUwgPSBgPGcgY2xpcC1wYXRoPVwidXJsKCNjbGlwMF82MDEzXzMzODU4KVwiPlxuPHBhdGggZD1cIk00LjggMTcuNkwxMiA1LjZMMTkuMiAxNy42SDQuOFpNNi45MTY2NyAxNi40SDE3LjA4MzNMMTIgNy45MzMzM0w2LjkxNjY3IDE2LjRaTTEyIDE1LjZDMTIuMTY2NyAxNS42IDEyLjMwNTYgMTUuNTQ0NCAxMi40MTY3IDE1LjQzMzNDMTIuNTM4OSAxNS4zMTExIDEyLjYgMTUuMTY2NyAxMi42IDE1QzEyLjYgMTQuODMzMyAxMi41Mzg5IDE0LjY5NDQgMTIuNDE2NyAxNC41ODMzQzEyLjMwNTYgMTQuNDYxMSAxMi4xNjY3IDE0LjQgMTIgMTQuNEMxMS44MzMzIDE0LjQgMTEuNjg4OSAxNC40NjExIDExLjU2NjcgMTQuNTgzM0MxMS40NTU2IDE0LjY5NDQgMTEuNCAxNC44MzMzIDExLjQgMTVDMTEuNCAxNS4xNjY3IDExLjQ1NTYgMTUuMzExMSAxMS41NjY3IDE1LjQzMzNDMTEuNjg4OSAxNS41NDQ0IDExLjgzMzMgMTUuNiAxMiAxNS42Wk0xMS40IDEzLjZIMTIuNlYxMC40SDExLjRWMTMuNlpcIiBmaWxsPVwiIzIxMjEyMVwiLz5cbjwvZz5cbjxkZWZzPlxuPGNsaXBQYXRoIGlkPVwiY2xpcDBfNjAxM18zMzg1OFwiPlxuPHJlY3Qgd2lkdGg9XCIyNFwiIGhlaWdodD1cIjI0XCIgZmlsbD1cIndoaXRlXCIvPlxuPC9jbGlwUGF0aD5cbjwvZGVmcz5gO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcHJlcGVuZEljb24uaW5uZXJIVE1MID0gYDxnIGNsaXAtcGF0aD1cInVybCgjY2xpcDBfNjA4M18zNDgwNClcIj5cbjxwYXRoIGQ9XCJNMTEuNCAxNS4ySDEyLjZWMTEuMkgxMS40VjE1LjJaTTEyIDEwQzEyLjE2NjcgMTAgMTIuMzA1NiA5Ljk0NDQ0IDEyLjQxNjcgOS44MzMzM0MxMi41Mzg5IDkuNzExMTEgMTIuNiA5LjU2NjY3IDEyLjYgOS40QzEyLjYgOS4yMzMzMyAxMi41Mzg5IDkuMDk0NDQgMTIuNDE2NyA4Ljk4MzMzQzEyLjMwNTYgOC44NjExMSAxMi4xNjY3IDguOCAxMiA4LjhDMTEuODMzMyA4LjggMTEuNjg4OSA4Ljg2MTExIDExLjU2NjcgOC45ODMzM0MxMS40NTU2IDkuMDk0NDQgMTEuNCA5LjIzMzMzIDExLjQgOS40QzExLjQgOS41NjY2NyAxMS40NTU2IDkuNzExMTEgMTEuNTY2NyA5LjgzMzMzQzExLjY4ODkgOS45NDQ0NCAxMS44MzMzIDEwIDEyIDEwWk0xMiAxOC40QzExLjEyMjIgMTguNCAxMC4yOTQ0IDE4LjIzMzMgOS41MTY2NyAxNy45QzguNzM4ODkgMTcuNTY2NyA4LjA1NTU2IDE3LjExMTEgNy40NjY2NyAxNi41MzMzQzYuODg4ODkgMTUuOTQ0NCA2LjQzMzMzIDE1LjI2MTEgNi4xIDE0LjQ4MzNDNS43NjY2NyAxMy43MDU2IDUuNiAxMi44Nzc4IDUuNiAxMkM1LjYgMTEuMTExMSA1Ljc2NjY3IDEwLjI4MzMgNi4xIDkuNTE2NjdDNi40MzMzMyA4LjczODg5IDYuODg4ODkgOC4wNjExMSA3LjQ2NjY3IDcuNDgzMzNDOC4wNTU1NiA2Ljg5NDQ0IDguNzM4ODkgNi40MzMzMyA5LjUxNjY3IDYuMUMxMC4yOTQ0IDUuNzY2NjcgMTEuMTIyMiA1LjYgMTIgNS42QzEyLjg4ODkgNS42IDEzLjcxNjcgNS43NjY2NyAxNC40ODMzIDYuMUMxNS4yNjExIDYuNDMzMzMgMTUuOTM4OSA2Ljg5NDQ0IDE2LjUxNjcgNy40ODMzM0MxNy4xMDU2IDguMDYxMTEgMTcuNTY2NyA4LjczODg5IDE3LjkgOS41MTY2N0MxOC4yMzMzIDEwLjI4MzMgMTguNCAxMS4xMTExIDE4LjQgMTJDMTguNCAxMi44Nzc4IDE4LjIzMzMgMTMuNzA1NiAxNy45IDE0LjQ4MzNDMTcuNTY2NyAxNS4yNjExIDE3LjEwNTYgMTUuOTQ0NCAxNi41MTY3IDE2LjUzMzNDMTUuOTM4OSAxNy4xMTExIDE1LjI2MTEgMTcuNTY2NyAxNC40ODMzIDE3LjlDMTMuNzE2NyAxOC4yMzMzIDEyLjg4ODkgMTguNCAxMiAxOC40Wk0xMiAxNy4yQzEzLjQ0NDQgMTcuMiAxNC42NzIyIDE2LjY5NDQgMTUuNjgzMyAxNS42ODMzQzE2LjY5NDQgMTQuNjcyMiAxNy4yIDEzLjQ0NDQgMTcuMiAxMkMxNy4yIDEwLjU1NTYgMTYuNjk0NCA5LjMyNzc4IDE1LjY4MzMgOC4zMTY2N0MxNC42NzIyIDcuMzA1NTUgMTMuNDQ0NCA2LjggMTIgNi44QzEwLjU1NTYgNi44IDkuMzI3NzggNy4zMDU1NSA4LjMxNjY3IDguMzE2NjdDNy4zMDU1NiA5LjMyNzc4IDYuOCAxMC41NTU2IDYuOCAxMkM2LjggMTMuNDQ0NCA3LjMwNTU2IDE0LjY3MjIgOC4zMTY2NyAxNS42ODMzQzkuMzI3NzggMTYuNjk0NCAxMC41NTU2IDE3LjIgMTIgMTcuMlpcIiBmaWxsPVwiIzIxMjEyMVwiLz5cbjwvZz5cbjxkZWZzPlxuPGNsaXBQYXRoIGlkPVwiY2xpcDBfNjA4M18zNDgwNFwiPlxuPHJlY3Qgd2lkdGg9XCIyNFwiIGhlaWdodD1cIjI0XCIgZmlsbD1cIndoaXRlXCIvPlxuPC9jbGlwUGF0aD5cbjwvZGVmcz5gO1xuICAgICAgICAgICAgZmlyZWJhc2VUZXh0LmlubmVyVGV4dCA9ICdQcmV2aWV3IGJhY2tlbmQgcnVubmluZyBpbiB0aGlzIHdvcmtzcGFjZS4nO1xuICAgICAgICB9XG4gICAgICAgIGZpcmViYXNlVGV4dC5zZXRBdHRyaWJ1dGUoJ2lkJywgZmlyZWJhc2VUZXh0SWQpO1xuICAgIH1cbiAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2xvYWRpbmcnKSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgc2V0dXBEb20pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2V0dXBEb20oKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIFJldHVybnMgbmF2aWdhdG9yLnVzZXJBZ2VudCBzdHJpbmcgb3IgJycgaWYgaXQncyBub3QgZGVmaW5lZC5cbiAqIEByZXR1cm4gdXNlciBhZ2VudCBzdHJpbmdcbiAqL1xuZnVuY3Rpb24gZ2V0VUEoKSB7XG4gICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIHR5cGVvZiBuYXZpZ2F0b3JbJ3VzZXJBZ2VudCddID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gbmF2aWdhdG9yWyd1c2VyQWdlbnQnXTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG59XG4vKipcbiAqIERldGVjdCBDb3Jkb3ZhIC8gUGhvbmVHYXAgLyBJb25pYyBmcmFtZXdvcmtzIG9uIGEgbW9iaWxlIGRldmljZS5cbiAqXG4gKiBEZWxpYmVyYXRlbHkgZG9lcyBub3QgcmVseSBvbiBjaGVja2luZyBgZmlsZTovL2AgVVJMcyAoYXMgdGhpcyBmYWlscyBQaG9uZUdhcFxuICogaW4gdGhlIFJpcHBsZSBlbXVsYXRvcikgbm9yIENvcmRvdmEgYG9uRGV2aWNlUmVhZHlgLCB3aGljaCB3b3VsZCBub3JtYWxseVxuICogd2FpdCBmb3IgYSBjYWxsYmFjay5cbiAqL1xuZnVuY3Rpb24gaXNNb2JpbGVDb3Jkb3ZhKCkge1xuICAgIHJldHVybiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBTZXR0aW5nIHVwIGFuIGJyb2FkbHkgYXBwbGljYWJsZSBpbmRleCBzaWduYXR1cmUgZm9yIFdpbmRvd1xuICAgICAgICAvLyBqdXN0IHRvIGRlYWwgd2l0aCB0aGlzIGNhc2Ugd291bGQgcHJvYmFibHkgYmUgYSBiYWQgaWRlYS5cbiAgICAgICAgISEod2luZG93Wydjb3Jkb3ZhJ10gfHwgd2luZG93WydwaG9uZWdhcCddIHx8IHdpbmRvd1snUGhvbmVHYXAnXSkgJiZcbiAgICAgICAgL2lvc3xpcGhvbmV8aXBvZHxpcGFkfGFuZHJvaWR8YmxhY2tiZXJyeXxpZW1vYmlsZS9pLnRlc3QoZ2V0VUEoKSkpO1xufVxuLyoqXG4gKiBEZXRlY3QgTm9kZS5qcy5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgTm9kZS5qcyBlbnZpcm9ubWVudCBpcyBkZXRlY3RlZCBvciBzcGVjaWZpZWQuXG4gKi9cbi8vIE5vZGUgZGV0ZWN0aW9uIGxvZ2ljIGZyb206IGh0dHBzOi8vZ2l0aHViLmNvbS9pbGlha2FuL2RldGVjdC1ub2RlL1xuZnVuY3Rpb24gaXNOb2RlKCkge1xuICAgIGNvbnN0IGZvcmNlRW52aXJvbm1lbnQgPSBnZXREZWZhdWx0cygpPy5mb3JjZUVudmlyb25tZW50O1xuICAgIGlmIChmb3JjZUVudmlyb25tZW50ID09PSAnbm9kZScpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGVsc2UgaWYgKGZvcmNlRW52aXJvbm1lbnQgPT09ICdicm93c2VyJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGdsb2JhbC5wcm9jZXNzKSA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cbi8qKlxuICogRGV0ZWN0IEJyb3dzZXIgRW52aXJvbm1lbnQuXG4gKiBOb3RlOiBUaGlzIHdpbGwgcmV0dXJuIHRydWUgZm9yIGNlcnRhaW4gdGVzdCBmcmFtZXdvcmtzIHRoYXQgYXJlIGluY29tcGxldGVseVxuICogbWltaWNraW5nIGEgYnJvd3NlciwgYW5kIHNob3VsZCBub3QgbGVhZCB0byBhc3N1bWluZyBhbGwgYnJvd3NlciBBUElzIGFyZVxuICogYXZhaWxhYmxlLlxuICovXG5mdW5jdGlvbiBpc0Jyb3dzZXIoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnIHx8IGlzV2ViV29ya2VyKCk7XG59XG4vKipcbiAqIERldGVjdCBXZWIgV29ya2VyIGNvbnRleHQuXG4gKi9cbmZ1bmN0aW9uIGlzV2ViV29ya2VyKCkge1xuICAgIHJldHVybiAodHlwZW9mIFdvcmtlckdsb2JhbFNjb3BlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgc2VsZiBpbnN0YW5jZW9mIFdvcmtlckdsb2JhbFNjb3BlKTtcbn1cbi8qKlxuICogRGV0ZWN0IENsb3VkZmxhcmUgV29ya2VyIGNvbnRleHQuXG4gKi9cbmZ1bmN0aW9uIGlzQ2xvdWRmbGFyZVdvcmtlcigpIHtcbiAgICByZXR1cm4gKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIG5hdmlnYXRvci51c2VyQWdlbnQgPT09ICdDbG91ZGZsYXJlLVdvcmtlcnMnKTtcbn1cbmZ1bmN0aW9uIGlzQnJvd3NlckV4dGVuc2lvbigpIHtcbiAgICBjb25zdCBydW50aW1lID0gdHlwZW9mIGNocm9tZSA9PT0gJ29iamVjdCdcbiAgICAgICAgPyBjaHJvbWUucnVudGltZVxuICAgICAgICA6IHR5cGVvZiBicm93c2VyID09PSAnb2JqZWN0J1xuICAgICAgICAgICAgPyBicm93c2VyLnJ1bnRpbWVcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgIHJldHVybiB0eXBlb2YgcnVudGltZSA9PT0gJ29iamVjdCcgJiYgcnVudGltZS5pZCAhPT0gdW5kZWZpbmVkO1xufVxuLyoqXG4gKiBEZXRlY3QgUmVhY3QgTmF0aXZlLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiBSZWFjdE5hdGl2ZSBlbnZpcm9ubWVudCBpcyBkZXRlY3RlZC5cbiAqL1xuZnVuY3Rpb24gaXNSZWFjdE5hdGl2ZSgpIHtcbiAgICByZXR1cm4gKHR5cGVvZiBuYXZpZ2F0b3IgPT09ICdvYmplY3QnICYmIG5hdmlnYXRvclsncHJvZHVjdCddID09PSAnUmVhY3ROYXRpdmUnKTtcbn1cbi8qKiBEZXRlY3RzIEVsZWN0cm9uIGFwcHMuICovXG5mdW5jdGlvbiBpc0VsZWN0cm9uKCkge1xuICAgIHJldHVybiBnZXRVQSgpLmluZGV4T2YoJ0VsZWN0cm9uLycpID49IDA7XG59XG4vKiogRGV0ZWN0cyBJbnRlcm5ldCBFeHBsb3Jlci4gKi9cbmZ1bmN0aW9uIGlzSUUoKSB7XG4gICAgY29uc3QgdWEgPSBnZXRVQSgpO1xuICAgIHJldHVybiB1YS5pbmRleE9mKCdNU0lFICcpID49IDAgfHwgdWEuaW5kZXhPZignVHJpZGVudC8nKSA+PSAwO1xufVxuLyoqIERldGVjdHMgVW5pdmVyc2FsIFdpbmRvd3MgUGxhdGZvcm0gYXBwcy4gKi9cbmZ1bmN0aW9uIGlzVVdQKCkge1xuICAgIHJldHVybiBnZXRVQSgpLmluZGV4T2YoJ01TQXBwSG9zdC8nKSA+PSAwO1xufVxuLyoqXG4gKiBEZXRlY3Qgd2hldGhlciB0aGUgY3VycmVudCBTREsgYnVpbGQgaXMgdGhlIE5vZGUgdmVyc2lvbi5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgaXQncyB0aGUgTm9kZSBTREsgYnVpbGQuXG4gKi9cbmZ1bmN0aW9uIGlzTm9kZVNkaygpIHtcbiAgICByZXR1cm4gQ09OU1RBTlRTLk5PREVfQ0xJRU5UID09PSB0cnVlIHx8IENPTlNUQU5UUy5OT0RFX0FETUlOID09PSB0cnVlO1xufVxuLyoqIFJldHVybnMgdHJ1ZSBpZiB3ZSBhcmUgcnVubmluZyBpbiBTYWZhcmkuICovXG5mdW5jdGlvbiBpc1NhZmFyaSgpIHtcbiAgICByZXR1cm4gKCFpc05vZGUoKSAmJlxuICAgICAgICAhIW5hdmlnYXRvci51c2VyQWdlbnQgJiZcbiAgICAgICAgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmNsdWRlcygnU2FmYXJpJykgJiZcbiAgICAgICAgIW5hdmlnYXRvci51c2VyQWdlbnQuaW5jbHVkZXMoJ0Nocm9tZScpKTtcbn1cbi8qKiBSZXR1cm5zIHRydWUgaWYgd2UgYXJlIHJ1bm5pbmcgaW4gU2FmYXJpIG9yIFdlYktpdCAqL1xuZnVuY3Rpb24gaXNTYWZhcmlPcldlYmtpdCgpIHtcbiAgICByZXR1cm4gKCFpc05vZGUoKSAmJlxuICAgICAgICAhIW5hdmlnYXRvci51c2VyQWdlbnQgJiZcbiAgICAgICAgKG5hdmlnYXRvci51c2VyQWdlbnQuaW5jbHVkZXMoJ1NhZmFyaScpIHx8XG4gICAgICAgICAgICBuYXZpZ2F0b3IudXNlckFnZW50LmluY2x1ZGVzKCdXZWJLaXQnKSkgJiZcbiAgICAgICAgIW5hdmlnYXRvci51c2VyQWdlbnQuaW5jbHVkZXMoJ0Nocm9tZScpKTtcbn1cbi8qKlxuICogVGhpcyBtZXRob2QgY2hlY2tzIGlmIGluZGV4ZWREQiBpcyBzdXBwb3J0ZWQgYnkgY3VycmVudCBicm93c2VyL3NlcnZpY2Ugd29ya2VyIGNvbnRleHRcbiAqIEByZXR1cm4gdHJ1ZSBpZiBpbmRleGVkREIgaXMgc3VwcG9ydGVkIGJ5IGN1cnJlbnQgYnJvd3Nlci9zZXJ2aWNlIHdvcmtlciBjb250ZXh0XG4gKi9cbmZ1bmN0aW9uIGlzSW5kZXhlZERCQXZhaWxhYmxlKCkge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5kZXhlZERCID09PSAnb2JqZWN0JztcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cbi8qKlxuICogVGhpcyBtZXRob2QgdmFsaWRhdGVzIGJyb3dzZXIvc3cgY29udGV4dCBmb3IgaW5kZXhlZERCIGJ5IG9wZW5pbmcgYSBkdW1teSBpbmRleGVkREIgZGF0YWJhc2UgYW5kIHJlamVjdFxuICogaWYgZXJyb3JzIG9jY3VyIGR1cmluZyB0aGUgZGF0YWJhc2Ugb3BlbiBvcGVyYXRpb24uXG4gKlxuICogQHRocm93cyBleGNlcHRpb24gaWYgY3VycmVudCBicm93c2VyL3N3IGNvbnRleHQgY2FuJ3QgcnVuIGlkYi5vcGVuIChleDogU2FmYXJpIGlmcmFtZSwgRmlyZWZveFxuICogcHJpdmF0ZSBicm93c2luZylcbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVJbmRleGVkREJPcGVuYWJsZSgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IHByZUV4aXN0ID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnN0IERCX0NIRUNLX05BTUUgPSAndmFsaWRhdGUtYnJvd3Nlci1jb250ZXh0LWZvci1pbmRleGVkZGItYW5hbHl0aWNzLW1vZHVsZSc7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gc2VsZi5pbmRleGVkREIub3BlbihEQl9DSEVDS19OQU1FKTtcbiAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlcXVlc3QucmVzdWx0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgLy8gZGVsZXRlIGRhdGFiYXNlIG9ubHkgd2hlbiBpdCBkb2Vzbid0IHByZS1leGlzdFxuICAgICAgICAgICAgICAgIGlmICghcHJlRXhpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5pbmRleGVkREIuZGVsZXRlRGF0YWJhc2UoREJfQ0hFQ0tfTkFNRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmVxdWVzdC5vbnVwZ3JhZGVuZWVkZWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcHJlRXhpc3QgPSBmYWxzZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHJlcXVlc3QuZXJyb3I/Lm1lc3NhZ2UgfHwgJycpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbi8qKlxuICpcbiAqIFRoaXMgbWV0aG9kIGNoZWNrcyB3aGV0aGVyIGNvb2tpZSBpcyBlbmFibGVkIHdpdGhpbiBjdXJyZW50IGJyb3dzZXJcbiAqIEByZXR1cm4gdHJ1ZSBpZiBjb29raWUgaXMgZW5hYmxlZCB3aXRoaW4gY3VycmVudCBicm93c2VyXG4gKi9cbmZ1bmN0aW9uIGFyZUNvb2tpZXNFbmFibGVkKCkge1xuICAgIGlmICh0eXBlb2YgbmF2aWdhdG9yID09PSAndW5kZWZpbmVkJyB8fCAhbmF2aWdhdG9yLmNvb2tpZUVuYWJsZWQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQGZpbGVvdmVydmlldyBTdGFuZGFyZGl6ZWQgRmlyZWJhc2UgRXJyb3IuXG4gKlxuICogVXNhZ2U6XG4gKlxuICogICAvLyBUeXBlU2NyaXB0IHN0cmluZyBsaXRlcmFscyBmb3IgdHlwZS1zYWZlIGNvZGVzXG4gKiAgIHR5cGUgRXJyID1cbiAqICAgICAndW5rbm93bicgfFxuICogICAgICdvYmplY3Qtbm90LWZvdW5kJ1xuICogICAgIDtcbiAqXG4gKiAgIC8vIENsb3N1cmUgZW51bSBmb3IgdHlwZS1zYWZlIGVycm9yIGNvZGVzXG4gKiAgIC8vIGF0LWVudW0ge3N0cmluZ31cbiAqICAgdmFyIEVyciA9IHtcbiAqICAgICBVTktOT1dOOiAndW5rbm93bicsXG4gKiAgICAgT0JKRUNUX05PVF9GT1VORDogJ29iamVjdC1ub3QtZm91bmQnLFxuICogICB9XG4gKlxuICogICBsZXQgZXJyb3JzOiBNYXA8RXJyLCBzdHJpbmc+ID0ge1xuICogICAgICdnZW5lcmljLWVycm9yJzogXCJVbmtub3duIGVycm9yXCIsXG4gKiAgICAgJ2ZpbGUtbm90LWZvdW5kJzogXCJDb3VsZCBub3QgZmluZCBmaWxlOiB7JGZpbGV9XCIsXG4gKiAgIH07XG4gKlxuICogICAvLyBUeXBlLXNhZmUgZnVuY3Rpb24gLSBtdXN0IHBhc3MgYSB2YWxpZCBlcnJvciBjb2RlIGFzIHBhcmFtLlxuICogICBsZXQgZXJyb3IgPSBuZXcgRXJyb3JGYWN0b3J5PEVycj4oJ3NlcnZpY2UnLCAnU2VydmljZScsIGVycm9ycyk7XG4gKlxuICogICAuLi5cbiAqICAgdGhyb3cgZXJyb3IuY3JlYXRlKEVyci5HRU5FUklDKTtcbiAqICAgLi4uXG4gKiAgIHRocm93IGVycm9yLmNyZWF0ZShFcnIuRklMRV9OT1RfRk9VTkQsIHsnZmlsZSc6IGZpbGVOYW1lfSk7XG4gKiAgIC4uLlxuICogICAvLyBTZXJ2aWNlOiBDb3VsZCBub3QgZmlsZSBmaWxlOiBmb28udHh0IChzZXJ2aWNlL2ZpbGUtbm90LWZvdW5kKS5cbiAqXG4gKiAgIGNhdGNoIChlKSB7XG4gKiAgICAgYXNzZXJ0KGUubWVzc2FnZSA9PT0gXCJDb3VsZCBub3QgZmluZCBmaWxlOiBmb28udHh0LlwiKTtcbiAqICAgICBpZiAoKGUgYXMgRmlyZWJhc2VFcnJvcik/LmNvZGUgPT09ICdzZXJ2aWNlL2ZpbGUtbm90LWZvdW5kJykge1xuICogICAgICAgY29uc29sZS5sb2coXCJDb3VsZCBub3QgcmVhZCBmaWxlOiBcIiArIGVbJ2ZpbGUnXSk7XG4gKiAgICAgfVxuICogICB9XG4gKi9cbmNvbnN0IEVSUk9SX05BTUUgPSAnRmlyZWJhc2VFcnJvcic7XG4vLyBCYXNlZCBvbiBjb2RlIGZyb206XG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9FcnJvciNDdXN0b21fRXJyb3JfVHlwZXNcbmNsYXNzIEZpcmViYXNlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgLyoqIFRoZSBlcnJvciBjb2RlIGZvciB0aGlzIGVycm9yLiAqL1xuICAgIGNvZGUsIG1lc3NhZ2UsIFxuICAgIC8qKiBDdXN0b20gZGF0YSBmb3IgdGhpcyBlcnJvci4gKi9cbiAgICBjdXN0b21EYXRhKSB7XG4gICAgICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgICAgICB0aGlzLmNvZGUgPSBjb2RlO1xuICAgICAgICB0aGlzLmN1c3RvbURhdGEgPSBjdXN0b21EYXRhO1xuICAgICAgICAvKiogVGhlIGN1c3RvbSBuYW1lIGZvciBhbGwgRmlyZWJhc2VFcnJvcnMuICovXG4gICAgICAgIHRoaXMubmFtZSA9IEVSUk9SX05BTUU7XG4gICAgICAgIC8vIEZpeCBGb3IgRVM1XG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC13aWtpL2Jsb2IvbWFzdGVyL0JyZWFraW5nLUNoYW5nZXMubWQjZXh0ZW5kaW5nLWJ1aWx0LWlucy1saWtlLWVycm9yLWFycmF5LWFuZC1tYXAtbWF5LW5vLWxvbmdlci13b3JrXG4gICAgICAgIC8vIFRPRE8oZGxhcm9jcXVlKTogUmVwbGFjZSB0aGlzIHdpdGggYG5ldy50YXJnZXRgOiBodHRwczovL3d3dy50eXBlc2NyaXB0bGFuZy5vcmcvZG9jcy9oYW5kYm9vay9yZWxlYXNlLW5vdGVzL3R5cGVzY3JpcHQtMi0yLmh0bWwjc3VwcG9ydC1mb3ItbmV3dGFyZ2V0XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgIHdoaWNoIHdlIGNhbiBub3cgdXNlIHNpbmNlIHdlIG5vIGxvbmdlciB0YXJnZXQgRVM1LlxuICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YodGhpcywgRmlyZWJhc2VFcnJvci5wcm90b3R5cGUpO1xuICAgICAgICAvLyBNYWludGFpbnMgcHJvcGVyIHN0YWNrIHRyYWNlIGZvciB3aGVyZSBvdXIgZXJyb3Igd2FzIHRocm93bi5cbiAgICAgICAgLy8gT25seSBhdmFpbGFibGUgb24gVjguXG4gICAgICAgIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgICAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgRXJyb3JGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuY2xhc3MgRXJyb3JGYWN0b3J5IHtcbiAgICBjb25zdHJ1Y3RvcihzZXJ2aWNlLCBzZXJ2aWNlTmFtZSwgZXJyb3JzKSB7XG4gICAgICAgIHRoaXMuc2VydmljZSA9IHNlcnZpY2U7XG4gICAgICAgIHRoaXMuc2VydmljZU5hbWUgPSBzZXJ2aWNlTmFtZTtcbiAgICAgICAgdGhpcy5lcnJvcnMgPSBlcnJvcnM7XG4gICAgfVxuICAgIGNyZWF0ZShjb2RlLCAuLi5kYXRhKSB7XG4gICAgICAgIGNvbnN0IGN1c3RvbURhdGEgPSBkYXRhWzBdIHx8IHt9O1xuICAgICAgICBjb25zdCBmdWxsQ29kZSA9IGAke3RoaXMuc2VydmljZX0vJHtjb2RlfWA7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5lcnJvcnNbY29kZV07XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0ZW1wbGF0ZSA/IHJlcGxhY2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgY3VzdG9tRGF0YSkgOiAnRXJyb3InO1xuICAgICAgICAvLyBTZXJ2aWNlIE5hbWU6IEVycm9yIG1lc3NhZ2UgKHNlcnZpY2UvY29kZSkuXG4gICAgICAgIGNvbnN0IGZ1bGxNZXNzYWdlID0gYCR7dGhpcy5zZXJ2aWNlTmFtZX06ICR7bWVzc2FnZX0gKCR7ZnVsbENvZGV9KS5gO1xuICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBGaXJlYmFzZUVycm9yKGZ1bGxDb2RlLCBmdWxsTWVzc2FnZSwgY3VzdG9tRGF0YSk7XG4gICAgICAgIHJldHVybiBlcnJvcjtcbiAgICB9XG59XG5mdW5jdGlvbiByZXBsYWNlVGVtcGxhdGUodGVtcGxhdGUsIGRhdGEpIHtcbiAgICByZXR1cm4gdGVtcGxhdGUucmVwbGFjZShQQVRURVJOLCAoXywga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVtrZXldO1xuICAgICAgICByZXR1cm4gdmFsdWUgIT0gbnVsbCA/IFN0cmluZyh2YWx1ZSkgOiBgPCR7a2V5fT8+YDtcbiAgICB9KTtcbn1cbmNvbnN0IFBBVFRFUk4gPSAvXFx7XFwkKFtefV0rKX0vZztcblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogRXZhbHVhdGVzIGEgSlNPTiBzdHJpbmcgaW50byBhIGphdmFzY3JpcHQgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHIgQSBzdHJpbmcgY29udGFpbmluZyBKU09OLlxuICogQHJldHVybiB7Kn0gVGhlIGphdmFzY3JpcHQgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgc3BlY2lmaWVkIEpTT04uXG4gKi9cbmZ1bmN0aW9uIGpzb25FdmFsKHN0cikge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHN0cik7XG59XG4vKipcbiAqIFJldHVybnMgSlNPTiByZXByZXNlbnRpbmcgYSBqYXZhc2NyaXB0IG9iamVjdC5cbiAqIEBwYXJhbSB7Kn0gZGF0YSBKYXZhU2NyaXB0IG9iamVjdCB0byBiZSBzdHJpbmdpZmllZC5cbiAqIEByZXR1cm4ge3N0cmluZ30gVGhlIEpTT04gY29udGVudHMgb2YgdGhlIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gc3RyaW5naWZ5KGRhdGEpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIERlY29kZXMgYSBGaXJlYmFzZSBhdXRoLiB0b2tlbiBpbnRvIGNvbnN0aXR1ZW50IHBhcnRzLlxuICpcbiAqIE5vdGVzOlxuICogLSBNYXkgcmV0dXJuIHdpdGggaW52YWxpZCAvIGluY29tcGxldGUgY2xhaW1zIGlmIHRoZXJlJ3Mgbm8gbmF0aXZlIGJhc2U2NCBkZWNvZGluZyBzdXBwb3J0LlxuICogLSBEb2Vzbid0IGNoZWNrIGlmIHRoZSB0b2tlbiBpcyBhY3R1YWxseSB2YWxpZC5cbiAqL1xuY29uc3QgZGVjb2RlID0gZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgbGV0IGhlYWRlciA9IHt9LCBjbGFpbXMgPSB7fSwgZGF0YSA9IHt9LCBzaWduYXR1cmUgPSAnJztcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXJ0cyA9IHRva2VuLnNwbGl0KCcuJyk7XG4gICAgICAgIGhlYWRlciA9IGpzb25FdmFsKGJhc2U2NERlY29kZShwYXJ0c1swXSkgfHwgJycpO1xuICAgICAgICBjbGFpbXMgPSBqc29uRXZhbChiYXNlNjREZWNvZGUocGFydHNbMV0pIHx8ICcnKTtcbiAgICAgICAgc2lnbmF0dXJlID0gcGFydHNbMl07XG4gICAgICAgIGRhdGEgPSBjbGFpbXNbJ2QnXSB8fCB7fTtcbiAgICAgICAgZGVsZXRlIGNsYWltc1snZCddO1xuICAgIH1cbiAgICBjYXRjaCAoZSkgeyB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgaGVhZGVyLFxuICAgICAgICBjbGFpbXMsXG4gICAgICAgIGRhdGEsXG4gICAgICAgIHNpZ25hdHVyZVxuICAgIH07XG59O1xuLyoqXG4gKiBEZWNvZGVzIGEgRmlyZWJhc2UgYXV0aC4gdG9rZW4gYW5kIGNoZWNrcyB0aGUgdmFsaWRpdHkgb2YgaXRzIHRpbWUtYmFzZWQgY2xhaW1zLiBXaWxsIHJldHVybiB0cnVlIGlmIHRoZVxuICogdG9rZW4gaXMgd2l0aGluIHRoZSB0aW1lIHdpbmRvdyBhdXRob3JpemVkIGJ5IHRoZSAnbmJmJyAobm90LWJlZm9yZSkgYW5kICdpYXQnIChpc3N1ZWQtYXQpIGNsYWltcy5cbiAqXG4gKiBOb3RlczpcbiAqIC0gTWF5IHJldHVybiBhIGZhbHNlIG5lZ2F0aXZlIGlmIHRoZXJlJ3Mgbm8gbmF0aXZlIGJhc2U2NCBkZWNvZGluZyBzdXBwb3J0LlxuICogLSBEb2Vzbid0IGNoZWNrIGlmIHRoZSB0b2tlbiBpcyBhY3R1YWxseSB2YWxpZC5cbiAqL1xuY29uc3QgaXNWYWxpZFRpbWVzdGFtcCA9IGZ1bmN0aW9uICh0b2tlbikge1xuICAgIGNvbnN0IGNsYWltcyA9IGRlY29kZSh0b2tlbikuY2xhaW1zO1xuICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IobmV3IERhdGUoKS5nZXRUaW1lKCkgLyAxMDAwKTtcbiAgICBsZXQgdmFsaWRTaW5jZSA9IDAsIHZhbGlkVW50aWwgPSAwO1xuICAgIGlmICh0eXBlb2YgY2xhaW1zID09PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAoY2xhaW1zLmhhc093blByb3BlcnR5KCduYmYnKSkge1xuICAgICAgICAgICAgdmFsaWRTaW5jZSA9IGNsYWltc1snbmJmJ107XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY2xhaW1zLmhhc093blByb3BlcnR5KCdpYXQnKSkge1xuICAgICAgICAgICAgdmFsaWRTaW5jZSA9IGNsYWltc1snaWF0J107XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNsYWltcy5oYXNPd25Qcm9wZXJ0eSgnZXhwJykpIHtcbiAgICAgICAgICAgIHZhbGlkVW50aWwgPSBjbGFpbXNbJ2V4cCddO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gdG9rZW4gd2lsbCBleHBpcmUgYWZ0ZXIgMjRoIGJ5IGRlZmF1bHRcbiAgICAgICAgICAgIHZhbGlkVW50aWwgPSB2YWxpZFNpbmNlICsgODY0MDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuICghIW5vdyAmJlxuICAgICAgICAhIXZhbGlkU2luY2UgJiZcbiAgICAgICAgISF2YWxpZFVudGlsICYmXG4gICAgICAgIG5vdyA+PSB2YWxpZFNpbmNlICYmXG4gICAgICAgIG5vdyA8PSB2YWxpZFVudGlsKTtcbn07XG4vKipcbiAqIERlY29kZXMgYSBGaXJlYmFzZSBhdXRoLiB0b2tlbiBhbmQgcmV0dXJucyBpdHMgaXNzdWVkIGF0IHRpbWUgaWYgdmFsaWQsIG51bGwgb3RoZXJ3aXNlLlxuICpcbiAqIE5vdGVzOlxuICogLSBNYXkgcmV0dXJuIG51bGwgaWYgdGhlcmUncyBubyBuYXRpdmUgYmFzZTY0IGRlY29kaW5nIHN1cHBvcnQuXG4gKiAtIERvZXNuJ3QgY2hlY2sgaWYgdGhlIHRva2VuIGlzIGFjdHVhbGx5IHZhbGlkLlxuICovXG5jb25zdCBpc3N1ZWRBdFRpbWUgPSBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICBjb25zdCBjbGFpbXMgPSBkZWNvZGUodG9rZW4pLmNsYWltcztcbiAgICBpZiAodHlwZW9mIGNsYWltcyA9PT0gJ29iamVjdCcgJiYgY2xhaW1zLmhhc093blByb3BlcnR5KCdpYXQnKSkge1xuICAgICAgICByZXR1cm4gY2xhaW1zWydpYXQnXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59O1xuLyoqXG4gKiBEZWNvZGVzIGEgRmlyZWJhc2UgYXV0aC4gdG9rZW4gYW5kIGNoZWNrcyB0aGUgdmFsaWRpdHkgb2YgaXRzIGZvcm1hdC4gRXhwZWN0cyBhIHZhbGlkIGlzc3VlZC1hdCB0aW1lLlxuICpcbiAqIE5vdGVzOlxuICogLSBNYXkgcmV0dXJuIGEgZmFsc2UgbmVnYXRpdmUgaWYgdGhlcmUncyBubyBuYXRpdmUgYmFzZTY0IGRlY29kaW5nIHN1cHBvcnQuXG4gKiAtIERvZXNuJ3QgY2hlY2sgaWYgdGhlIHRva2VuIGlzIGFjdHVhbGx5IHZhbGlkLlxuICovXG5jb25zdCBpc1ZhbGlkRm9ybWF0ID0gZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgY29uc3QgZGVjb2RlZCA9IGRlY29kZSh0b2tlbiksIGNsYWltcyA9IGRlY29kZWQuY2xhaW1zO1xuICAgIHJldHVybiAhIWNsYWltcyAmJiB0eXBlb2YgY2xhaW1zID09PSAnb2JqZWN0JyAmJiBjbGFpbXMuaGFzT3duUHJvcGVydHkoJ2lhdCcpO1xufTtcbi8qKlxuICogQXR0ZW1wdHMgdG8gcGVlciBpbnRvIGFuIGF1dGggdG9rZW4gYW5kIGRldGVybWluZSBpZiBpdCdzIGFuIGFkbWluIGF1dGggdG9rZW4gYnkgbG9va2luZyBhdCB0aGUgY2xhaW1zIHBvcnRpb24uXG4gKlxuICogTm90ZXM6XG4gKiAtIE1heSByZXR1cm4gYSBmYWxzZSBuZWdhdGl2ZSBpZiB0aGVyZSdzIG5vIG5hdGl2ZSBiYXNlNjQgZGVjb2Rpbmcgc3VwcG9ydC5cbiAqIC0gRG9lc24ndCBjaGVjayBpZiB0aGUgdG9rZW4gaXMgYWN0dWFsbHkgdmFsaWQuXG4gKi9cbmNvbnN0IGlzQWRtaW4gPSBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICBjb25zdCBjbGFpbXMgPSBkZWNvZGUodG9rZW4pLmNsYWltcztcbiAgICByZXR1cm4gdHlwZW9mIGNsYWltcyA9PT0gJ29iamVjdCcgJiYgY2xhaW1zWydhZG1pbiddID09PSB0cnVlO1xufTtcblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmZ1bmN0aW9uIGNvbnRhaW5zKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG59XG5mdW5jdGlvbiBzYWZlR2V0KG9iaiwga2V5KSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHtcbiAgICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG59XG5mdW5jdGlvbiBpc0VtcHR5KG9iaikge1xuICAgIGZvciAoY29uc3Qga2V5IGluIG9iaikge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuZnVuY3Rpb24gbWFwKG9iaiwgZm4sIGNvbnRleHRPYmopIHtcbiAgICBjb25zdCByZXMgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gZm4uY2FsbChjb250ZXh0T2JqLCBvYmpba2V5XSwga2V5LCBvYmopO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG4vKipcbiAqIERlZXAgZXF1YWwgdHdvIG9iamVjdHMuIFN1cHBvcnQgQXJyYXlzIGFuZCBPYmplY3RzLlxuICovXG5mdW5jdGlvbiBkZWVwRXF1YWwoYSwgYikge1xuICAgIGlmIChhID09PSBiKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjb25zdCBhS2V5cyA9IE9iamVjdC5rZXlzKGEpO1xuICAgIGNvbnN0IGJLZXlzID0gT2JqZWN0LmtleXMoYik7XG4gICAgZm9yIChjb25zdCBrIG9mIGFLZXlzKSB7XG4gICAgICAgIGlmICghYktleXMuaW5jbHVkZXMoaykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhUHJvcCA9IGFba107XG4gICAgICAgIGNvbnN0IGJQcm9wID0gYltrXTtcbiAgICAgICAgaWYgKGlzT2JqZWN0KGFQcm9wKSAmJiBpc09iamVjdChiUHJvcCkpIHtcbiAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKGFQcm9wLCBiUHJvcCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYVByb3AgIT09IGJQcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBrIG9mIGJLZXlzKSB7XG4gICAgICAgIGlmICghYUtleXMuaW5jbHVkZXMoaykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbmZ1bmN0aW9uIGlzT2JqZWN0KHRoaW5nKSB7XG4gICAgcmV0dXJuIHRoaW5nICE9PSBudWxsICYmIHR5cGVvZiB0aGluZyA9PT0gJ29iamVjdCc7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIyIEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIFJlamVjdHMgaWYgdGhlIGdpdmVuIHByb21pc2UgZG9lc24ndCByZXNvbHZlIGluIHRpbWVJbk1TIG1pbGxpc2Vjb25kcy5cbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBwcm9taXNlV2l0aFRpbWVvdXQocHJvbWlzZSwgdGltZUluTVMgPSAyMDAwKSB7XG4gICAgY29uc3QgZGVmZXJyZWRQcm9taXNlID0gbmV3IERlZmVycmVkKCk7XG4gICAgc2V0VGltZW91dCgoKSA9PiBkZWZlcnJlZFByb21pc2UucmVqZWN0KCd0aW1lb3V0IScpLCB0aW1lSW5NUyk7XG4gICAgcHJvbWlzZS50aGVuKGRlZmVycmVkUHJvbWlzZS5yZXNvbHZlLCBkZWZlcnJlZFByb21pc2UucmVqZWN0KTtcbiAgICByZXR1cm4gZGVmZXJyZWRQcm9taXNlLnByb21pc2U7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIFJldHVybnMgYSBxdWVyeXN0cmluZy1mb3JtYXR0ZWQgc3RyaW5nIChlLmcuICZhcmc9dmFsJmFyZzI9dmFsMikgZnJvbSBhXG4gKiBwYXJhbXMgb2JqZWN0IChlLmcuIHthcmc6ICd2YWwnLCBhcmcyOiAndmFsMid9KVxuICogTm90ZTogWW91IG11c3QgcHJlcGVuZCBpdCB3aXRoID8gd2hlbiBhZGRpbmcgaXQgdG8gYSBVUkwuXG4gKi9cbmZ1bmN0aW9uIHF1ZXJ5c3RyaW5nKHF1ZXJ5c3RyaW5nUGFyYW1zKSB7XG4gICAgY29uc3QgcGFyYW1zID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocXVlcnlzdHJpbmdQYXJhbXMpKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUuZm9yRWFjaChhcnJheVZhbCA9PiB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KGtleSkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoYXJyYXlWYWwpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcGFyYW1zLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KGtleSkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zLmxlbmd0aCA/ICcmJyArIHBhcmFtcy5qb2luKCcmJykgOiAnJztcbn1cbi8qKlxuICogRGVjb2RlcyBhIHF1ZXJ5c3RyaW5nIChlLmcuID9hcmc9dmFsJmFyZzI9dmFsMikgaW50byBhIHBhcmFtcyBvYmplY3RcbiAqIChlLmcuIHthcmc6ICd2YWwnLCBhcmcyOiAndmFsMid9KVxuICovXG5mdW5jdGlvbiBxdWVyeXN0cmluZ0RlY29kZShxdWVyeXN0cmluZykge1xuICAgIGNvbnN0IG9iaiA9IHt9O1xuICAgIGNvbnN0IHRva2VucyA9IHF1ZXJ5c3RyaW5nLnJlcGxhY2UoL15cXD8vLCAnJykuc3BsaXQoJyYnKTtcbiAgICB0b2tlbnMuZm9yRWFjaCh0b2tlbiA9PiB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgY29uc3QgW2tleSwgdmFsdWVdID0gdG9rZW4uc3BsaXQoJz0nKTtcbiAgICAgICAgICAgIG9ialtkZWNvZGVVUklDb21wb25lbnQoa2V5KV0gPSBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbn1cbi8qKlxuICogRXh0cmFjdCB0aGUgcXVlcnkgc3RyaW5nIHBhcnQgb2YgYSBVUkwsIGluY2x1ZGluZyB0aGUgbGVhZGluZyBxdWVzdGlvbiBtYXJrIChpZiBwcmVzZW50KS5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdFF1ZXJ5c3RyaW5nKHVybCkge1xuICAgIGNvbnN0IHF1ZXJ5U3RhcnQgPSB1cmwuaW5kZXhPZignPycpO1xuICAgIGlmICghcXVlcnlTdGFydCkge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIGNvbnN0IGZyYWdtZW50U3RhcnQgPSB1cmwuaW5kZXhPZignIycsIHF1ZXJ5U3RhcnQpO1xuICAgIHJldHVybiB1cmwuc3Vic3RyaW5nKHF1ZXJ5U3RhcnQsIGZyYWdtZW50U3RhcnQgPiAwID8gZnJhZ21lbnRTdGFydCA6IHVuZGVmaW5lZCk7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBmaWxlb3ZlcnZpZXcgU0hBLTEgY3J5cHRvZ3JhcGhpYyBoYXNoLlxuICogVmFyaWFibGUgbmFtZXMgZm9sbG93IHRoZSBub3RhdGlvbiBpbiBGSVBTIFBVQiAxODAtMzpcbiAqIGh0dHA6Ly9jc3JjLm5pc3QuZ292L3B1YmxpY2F0aW9ucy9maXBzL2ZpcHMxODAtMy9maXBzMTgwLTNfZmluYWwucGRmLlxuICpcbiAqIFVzYWdlOlxuICogICB2YXIgc2hhMSA9IG5ldyBzaGExKCk7XG4gKiAgIHNoYTEudXBkYXRlKGJ5dGVzKTtcbiAqICAgdmFyIGhhc2ggPSBzaGExLmRpZ2VzdCgpO1xuICpcbiAqIFBlcmZvcm1hbmNlOlxuICogICBDaHJvbWUgMjM6ICAgfjQwMCBNYml0L3NcbiAqICAgRmlyZWZveCAxNjogIH4yNTAgTWJpdC9zXG4gKlxuICovXG4vKipcbiAqIFNIQS0xIGNyeXB0b2dyYXBoaWMgaGFzaCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBUaGUgcHJvcGVydGllcyBkZWNsYXJlZCBoZXJlIGFyZSBkaXNjdXNzZWQgaW4gdGhlIGFib3ZlIGFsZ29yaXRobSBkb2N1bWVudC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGZpbmFsXG4gKiBAc3RydWN0XG4gKi9cbmNsYXNzIFNoYTEge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogSG9sZHMgdGhlIHByZXZpb3VzIHZhbHVlcyBvZiBhY2N1bXVsYXRlZCB2YXJpYWJsZXMgYS1lIGluIHRoZSBjb21wcmVzc19cbiAgICAgICAgICogZnVuY3Rpb24uXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNoYWluXyA9IFtdO1xuICAgICAgICAvKipcbiAgICAgICAgICogQSBidWZmZXIgaG9sZGluZyB0aGUgcGFydGlhbGx5IGNvbXB1dGVkIGhhc2ggcmVzdWx0LlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5idWZfID0gW107XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbiBhcnJheSBvZiA4MCBieXRlcywgZWFjaCBhIHBhcnQgb2YgdGhlIG1lc3NhZ2UgdG8gYmUgaGFzaGVkLiAgUmVmZXJyZWQgdG9cbiAgICAgICAgICogYXMgdGhlIG1lc3NhZ2Ugc2NoZWR1bGUgaW4gdGhlIGRvY3MuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLldfID0gW107XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb250YWlucyBkYXRhIG5lZWRlZCB0byBwYWQgbWVzc2FnZXMgbGVzcyB0aGFuIDY0IGJ5dGVzLlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5wYWRfID0gW107XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcHJpdmF0ZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pbmJ1Zl8gPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogQHByaXZhdGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudG90YWxfID0gMDtcbiAgICAgICAgdGhpcy5ibG9ja1NpemUgPSA1MTIgLyA4O1xuICAgICAgICB0aGlzLnBhZF9bMF0gPSAxMjg7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdGhpcy5ibG9ja1NpemU7ICsraSkge1xuICAgICAgICAgICAgdGhpcy5wYWRfW2ldID0gMDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgfVxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLmNoYWluX1swXSA9IDB4Njc0NTIzMDE7XG4gICAgICAgIHRoaXMuY2hhaW5fWzFdID0gMHhlZmNkYWI4OTtcbiAgICAgICAgdGhpcy5jaGFpbl9bMl0gPSAweDk4YmFkY2ZlO1xuICAgICAgICB0aGlzLmNoYWluX1szXSA9IDB4MTAzMjU0NzY7XG4gICAgICAgIHRoaXMuY2hhaW5fWzRdID0gMHhjM2QyZTFmMDtcbiAgICAgICAgdGhpcy5pbmJ1Zl8gPSAwO1xuICAgICAgICB0aGlzLnRvdGFsXyA9IDA7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEludGVybmFsIGNvbXByZXNzIGhlbHBlciBmdW5jdGlvbi5cbiAgICAgKiBAcGFyYW0gYnVmIEJsb2NrIHRvIGNvbXByZXNzLlxuICAgICAqIEBwYXJhbSBvZmZzZXQgT2Zmc2V0IG9mIHRoZSBibG9jayBpbiB0aGUgYnVmZmVyLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgY29tcHJlc3NfKGJ1Ziwgb2Zmc2V0KSB7XG4gICAgICAgIGlmICghb2Zmc2V0KSB7XG4gICAgICAgICAgICBvZmZzZXQgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFcgPSB0aGlzLldfO1xuICAgICAgICAvLyBnZXQgMTYgYmlnIGVuZGlhbiB3b3Jkc1xuICAgICAgICBpZiAodHlwZW9mIGJ1ZiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTY7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8odXNlcik6IFtidWcgODE0MDEyMl0gUmVjZW50IHZlcnNpb25zIG9mIFNhZmFyaSBmb3IgTWFjIE9TIGFuZCBpT1NcbiAgICAgICAgICAgICAgICAvLyBoYXZlIGEgYnVnIHRoYXQgdHVybnMgdGhlIHBvc3QtaW5jcmVtZW50ICsrIG9wZXJhdG9yIGludG8gcHJlLWluY3JlbWVudFxuICAgICAgICAgICAgICAgIC8vIGR1cmluZyBKSVQgY29tcGlsYXRpb24uICBXZSBoYXZlIGNvZGUgdGhhdCBkZXBlbmRzIGhlYXZpbHkgb24gU0hBLTEgZm9yXG4gICAgICAgICAgICAgICAgLy8gY29ycmVjdG5lc3MgYW5kIHdoaWNoIGlzIGFmZmVjdGVkIGJ5IHRoaXMgYnVnLCBzbyBJJ3ZlIHJlbW92ZWQgYWxsIHVzZXNcbiAgICAgICAgICAgICAgICAvLyBvZiBwb3N0LWluY3JlbWVudCArKyBpbiB3aGljaCB0aGUgcmVzdWx0IHZhbHVlIGlzIHVzZWQuICBXZSBjYW4gcmV2ZXJ0XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBjaGFuZ2Ugb25jZSB0aGUgU2FmYXJpIGJ1Z1xuICAgICAgICAgICAgICAgIC8vIChodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTA5MDM2KSBoYXMgYmVlbiBmaXhlZCBhbmRcbiAgICAgICAgICAgICAgICAvLyBtb3N0IGNsaWVudHMgaGF2ZSBiZWVuIHVwZGF0ZWQuXG4gICAgICAgICAgICAgICAgV1tpXSA9XG4gICAgICAgICAgICAgICAgICAgIChidWYuY2hhckNvZGVBdChvZmZzZXQpIDw8IDI0KSB8XG4gICAgICAgICAgICAgICAgICAgICAgICAoYnVmLmNoYXJDb2RlQXQob2Zmc2V0ICsgMSkgPDwgMTYpIHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChidWYuY2hhckNvZGVBdChvZmZzZXQgKyAyKSA8PCA4KSB8XG4gICAgICAgICAgICAgICAgICAgICAgICBidWYuY2hhckNvZGVBdChvZmZzZXQgKyAzKTtcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gNDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTY7IGkrKykge1xuICAgICAgICAgICAgICAgIFdbaV0gPVxuICAgICAgICAgICAgICAgICAgICAoYnVmW29mZnNldF0gPDwgMjQpIHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChidWZbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChidWZbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmW29mZnNldCArIDNdO1xuICAgICAgICAgICAgICAgIG9mZnNldCArPSA0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGV4cGFuZCB0byA4MCB3b3Jkc1xuICAgICAgICBmb3IgKGxldCBpID0gMTY7IGkgPCA4MDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCB0ID0gV1tpIC0gM10gXiBXW2kgLSA4XSBeIFdbaSAtIDE0XSBeIFdbaSAtIDE2XTtcbiAgICAgICAgICAgIFdbaV0gPSAoKHQgPDwgMSkgfCAodCA+Pj4gMzEpKSAmIDB4ZmZmZmZmZmY7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGEgPSB0aGlzLmNoYWluX1swXTtcbiAgICAgICAgbGV0IGIgPSB0aGlzLmNoYWluX1sxXTtcbiAgICAgICAgbGV0IGMgPSB0aGlzLmNoYWluX1syXTtcbiAgICAgICAgbGV0IGQgPSB0aGlzLmNoYWluX1szXTtcbiAgICAgICAgbGV0IGUgPSB0aGlzLmNoYWluX1s0XTtcbiAgICAgICAgbGV0IGYsIGs7XG4gICAgICAgIC8vIFRPRE8odXNlcik6IFRyeSB0byB1bnJvbGwgdGhpcyBsb29wIHRvIHNwZWVkIHVwIHRoZSBjb21wdXRhdGlvbi5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA4MDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaSA8IDQwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPCAyMCkge1xuICAgICAgICAgICAgICAgICAgICBmID0gZCBeIChiICYgKGMgXiBkKSk7XG4gICAgICAgICAgICAgICAgICAgIGsgPSAweDVhODI3OTk5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZiA9IGIgXiBjIF4gZDtcbiAgICAgICAgICAgICAgICAgICAgayA9IDB4NmVkOWViYTE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPCA2MCkge1xuICAgICAgICAgICAgICAgICAgICBmID0gKGIgJiBjKSB8IChkICYgKGIgfCBjKSk7XG4gICAgICAgICAgICAgICAgICAgIGsgPSAweDhmMWJiY2RjO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZiA9IGIgXiBjIF4gZDtcbiAgICAgICAgICAgICAgICAgICAgayA9IDB4Y2E2MmMxZDY7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdCA9ICgoKGEgPDwgNSkgfCAoYSA+Pj4gMjcpKSArIGYgKyBlICsgayArIFdbaV0pICYgMHhmZmZmZmZmZjtcbiAgICAgICAgICAgIGUgPSBkO1xuICAgICAgICAgICAgZCA9IGM7XG4gICAgICAgICAgICBjID0gKChiIDw8IDMwKSB8IChiID4+PiAyKSkgJiAweGZmZmZmZmZmO1xuICAgICAgICAgICAgYiA9IGE7XG4gICAgICAgICAgICBhID0gdDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNoYWluX1swXSA9ICh0aGlzLmNoYWluX1swXSArIGEpICYgMHhmZmZmZmZmZjtcbiAgICAgICAgdGhpcy5jaGFpbl9bMV0gPSAodGhpcy5jaGFpbl9bMV0gKyBiKSAmIDB4ZmZmZmZmZmY7XG4gICAgICAgIHRoaXMuY2hhaW5fWzJdID0gKHRoaXMuY2hhaW5fWzJdICsgYykgJiAweGZmZmZmZmZmO1xuICAgICAgICB0aGlzLmNoYWluX1szXSA9ICh0aGlzLmNoYWluX1szXSArIGQpICYgMHhmZmZmZmZmZjtcbiAgICAgICAgdGhpcy5jaGFpbl9bNF0gPSAodGhpcy5jaGFpbl9bNF0gKyBlKSAmIDB4ZmZmZmZmZmY7XG4gICAgfVxuICAgIHVwZGF0ZShieXRlcywgbGVuZ3RoKSB7XG4gICAgICAgIC8vIFRPRE8oam9obmxlbnopOiB0aWdodGVuIHRoZSBmdW5jdGlvbiBzaWduYXR1cmUgYW5kIHJlbW92ZSB0aGlzIGNoZWNrXG4gICAgICAgIGlmIChieXRlcyA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZW5ndGggPSBieXRlcy5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbGVuZ3RoTWludXNCbG9jayA9IGxlbmd0aCAtIHRoaXMuYmxvY2tTaXplO1xuICAgICAgICBsZXQgbiA9IDA7XG4gICAgICAgIC8vIFVzaW5nIGxvY2FsIGluc3RlYWQgb2YgbWVtYmVyIHZhcmlhYmxlcyBnaXZlcyB+NSUgc3BlZWR1cCBvbiBGaXJlZm94IDE2LlxuICAgICAgICBjb25zdCBidWYgPSB0aGlzLmJ1Zl87XG4gICAgICAgIGxldCBpbmJ1ZiA9IHRoaXMuaW5idWZfO1xuICAgICAgICAvLyBUaGUgb3V0ZXIgd2hpbGUgbG9vcCBzaG91bGQgZXhlY3V0ZSBhdCBtb3N0IHR3aWNlLlxuICAgICAgICB3aGlsZSAobiA8IGxlbmd0aCkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBoYXZlIG5vIGRhdGEgaW4gdGhlIGJsb2NrIHRvIHRvcCB1cCwgd2UgY2FuIGRpcmVjdGx5IHByb2Nlc3MgdGhlXG4gICAgICAgICAgICAvLyBpbnB1dCBidWZmZXIgKGFzc3VtaW5nIGl0IGNvbnRhaW5zIHN1ZmZpY2llbnQgZGF0YSkuIFRoaXMgZ2l2ZXMgfjI1JVxuICAgICAgICAgICAgLy8gc3BlZWR1cCBvbiBDaHJvbWUgMjMgYW5kIH4xNSUgc3BlZWR1cCBvbiBGaXJlZm94IDE2LCBidXQgcmVxdWlyZXMgdGhhdFxuICAgICAgICAgICAgLy8gdGhlIGRhdGEgaXMgcHJvdmlkZWQgaW4gbGFyZ2UgY2h1bmtzIChvciBpbiBtdWx0aXBsZXMgb2YgNjQgYnl0ZXMpLlxuICAgICAgICAgICAgaWYgKGluYnVmID09PSAwKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKG4gPD0gbGVuZ3RoTWludXNCbG9jaykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXByZXNzXyhieXRlcywgbik7XG4gICAgICAgICAgICAgICAgICAgIG4gKz0gdGhpcy5ibG9ja1NpemU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBieXRlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAobiA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBidWZbaW5idWZdID0gYnl0ZXMuY2hhckNvZGVBdChuKTtcbiAgICAgICAgICAgICAgICAgICAgKytpbmJ1ZjtcbiAgICAgICAgICAgICAgICAgICAgKytuO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5idWYgPT09IHRoaXMuYmxvY2tTaXplKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXByZXNzXyhidWYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5idWYgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSnVtcCB0byB0aGUgb3V0ZXIgbG9vcCBzbyB3ZSB1c2UgdGhlIGZ1bGwtYmxvY2sgb3B0aW1pemF0aW9uLlxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAobiA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBidWZbaW5idWZdID0gYnl0ZXNbbl07XG4gICAgICAgICAgICAgICAgICAgICsraW5idWY7XG4gICAgICAgICAgICAgICAgICAgICsrbjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluYnVmID09PSB0aGlzLmJsb2NrU2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21wcmVzc18oYnVmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluYnVmID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEp1bXAgdG8gdGhlIG91dGVyIGxvb3Agc28gd2UgdXNlIHRoZSBmdWxsLWJsb2NrIG9wdGltaXphdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5idWZfID0gaW5idWY7XG4gICAgICAgIHRoaXMudG90YWxfICs9IGxlbmd0aDtcbiAgICB9XG4gICAgLyoqIEBvdmVycmlkZSAqL1xuICAgIGRpZ2VzdCgpIHtcbiAgICAgICAgY29uc3QgZGlnZXN0ID0gW107XG4gICAgICAgIGxldCB0b3RhbEJpdHMgPSB0aGlzLnRvdGFsXyAqIDg7XG4gICAgICAgIC8vIEFkZCBwYWQgMHg4MCAweDAwKi5cbiAgICAgICAgaWYgKHRoaXMuaW5idWZfIDwgNTYpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKHRoaXMucGFkXywgNTYgLSB0aGlzLmluYnVmXyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSh0aGlzLnBhZF8sIHRoaXMuYmxvY2tTaXplIC0gKHRoaXMuaW5idWZfIC0gNTYpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgIyBiaXRzLlxuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5ibG9ja1NpemUgLSAxOyBpID49IDU2OyBpLS0pIHtcbiAgICAgICAgICAgIHRoaXMuYnVmX1tpXSA9IHRvdGFsQml0cyAmIDI1NTtcbiAgICAgICAgICAgIHRvdGFsQml0cyAvPSAyNTY7IC8vIERvbid0IHVzZSBiaXQtc2hpZnRpbmcgaGVyZSFcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbXByZXNzXyh0aGlzLmJ1Zl8pO1xuICAgICAgICBsZXQgbiA9IDA7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNTsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMjQ7IGogPj0gMDsgaiAtPSA4KSB7XG4gICAgICAgICAgICAgICAgZGlnZXN0W25dID0gKHRoaXMuY2hhaW5fW2ldID4+IGopICYgMjU1O1xuICAgICAgICAgICAgICAgICsrbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlnZXN0O1xuICAgIH1cbn1cblxuLyoqXG4gKiBIZWxwZXIgdG8gbWFrZSBhIFN1YnNjcmliZSBmdW5jdGlvbiAoanVzdCBsaWtlIFByb21pc2UgaGVscHMgbWFrZSBhXG4gKiBUaGVuYWJsZSkuXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yIEZ1bmN0aW9uIHdoaWNoIGNhbiBtYWtlIGNhbGxzIHRvIGEgc2luZ2xlIE9ic2VydmVyXG4gKiAgICAgYXMgYSBwcm94eS5cbiAqIEBwYXJhbSBvbk5vT2JzZXJ2ZXJzIENhbGxiYWNrIHdoZW4gY291bnQgb2YgT2JzZXJ2ZXJzIGdvZXMgdG8gemVyby5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlU3Vic2NyaWJlKGV4ZWN1dG9yLCBvbk5vT2JzZXJ2ZXJzKSB7XG4gICAgY29uc3QgcHJveHkgPSBuZXcgT2JzZXJ2ZXJQcm94eShleGVjdXRvciwgb25Ob09ic2VydmVycyk7XG4gICAgcmV0dXJuIHByb3h5LnN1YnNjcmliZS5iaW5kKHByb3h5KTtcbn1cbi8qKlxuICogSW1wbGVtZW50IGZhbi1vdXQgZm9yIGFueSBudW1iZXIgb2YgT2JzZXJ2ZXJzIGF0dGFjaGVkIHZpYSBhIHN1YnNjcmliZVxuICogZnVuY3Rpb24uXG4gKi9cbmNsYXNzIE9ic2VydmVyUHJveHkge1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSBleGVjdXRvciBGdW5jdGlvbiB3aGljaCBjYW4gbWFrZSBjYWxscyB0byBhIHNpbmdsZSBPYnNlcnZlclxuICAgICAqICAgICBhcyBhIHByb3h5LlxuICAgICAqIEBwYXJhbSBvbk5vT2JzZXJ2ZXJzIENhbGxiYWNrIHdoZW4gY291bnQgb2YgT2JzZXJ2ZXJzIGdvZXMgdG8gemVyby5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihleGVjdXRvciwgb25Ob09ic2VydmVycykge1xuICAgICAgICB0aGlzLm9ic2VydmVycyA9IFtdO1xuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlcyA9IFtdO1xuICAgICAgICB0aGlzLm9ic2VydmVyQ291bnQgPSAwO1xuICAgICAgICAvLyBNaWNyby10YXNrIHNjaGVkdWxpbmcgYnkgY2FsbGluZyB0YXNrLnRoZW4oKS5cbiAgICAgICAgdGhpcy50YXNrID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMub25Ob09ic2VydmVycyA9IG9uTm9PYnNlcnZlcnM7XG4gICAgICAgIC8vIENhbGwgdGhlIGV4ZWN1dG9yIGFzeW5jaHJvbm91c2x5IHNvIHN1YnNjcmliZXJzIHRoYXQgYXJlIGNhbGxlZFxuICAgICAgICAvLyBzeW5jaHJvbm91c2x5IGFmdGVyIHRoZSBjcmVhdGlvbiBvZiB0aGUgc3Vic2NyaWJlIGZ1bmN0aW9uXG4gICAgICAgIC8vIGNhbiBzdGlsbCByZWNlaXZlIHRoZSB2ZXJ5IGZpcnN0IHZhbHVlIGdlbmVyYXRlZCBpbiB0aGUgZXhlY3V0b3IuXG4gICAgICAgIHRoaXMudGFza1xuICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgZXhlY3V0b3IodGhpcyk7XG4gICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICB0aGlzLmVycm9yKGUpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbmV4dCh2YWx1ZSkge1xuICAgICAgICB0aGlzLmZvckVhY2hPYnNlcnZlcigob2JzZXJ2ZXIpID0+IHtcbiAgICAgICAgICAgIG9ic2VydmVyLm5leHQodmFsdWUpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZXJyb3IoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5mb3JFYWNoT2JzZXJ2ZXIoKG9ic2VydmVyKSA9PiB7XG4gICAgICAgICAgICBvYnNlcnZlci5lcnJvcihlcnJvcik7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmNsb3NlKGVycm9yKTtcbiAgICB9XG4gICAgY29tcGxldGUoKSB7XG4gICAgICAgIHRoaXMuZm9yRWFjaE9ic2VydmVyKChvYnNlcnZlcikgPT4ge1xuICAgICAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIHVzZWQgdG8gYWRkIGFuIE9ic2VydmVyIHRvIHRoZSBmYW4tb3V0IGxpc3QuXG4gICAgICpcbiAgICAgKiAtIFdlIHJlcXVpcmUgdGhhdCBubyBldmVudCBpcyBzZW50IHRvIGEgc3Vic2NyaWJlciBzeW5jaHJvbm91c2x5IHRvIHRoZWlyXG4gICAgICogICBjYWxsIHRvIHN1YnNjcmliZSgpLlxuICAgICAqL1xuICAgIHN1YnNjcmliZShuZXh0T3JPYnNlcnZlciwgZXJyb3IsIGNvbXBsZXRlKSB7XG4gICAgICAgIGxldCBvYnNlcnZlcjtcbiAgICAgICAgaWYgKG5leHRPck9ic2VydmVyID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIGVycm9yID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIGNvbXBsZXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBPYnNlcnZlci4nKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBc3NlbWJsZSBhbiBPYnNlcnZlciBvYmplY3Qgd2hlbiBwYXNzZWQgYXMgY2FsbGJhY2sgZnVuY3Rpb25zLlxuICAgICAgICBpZiAoaW1wbGVtZW50c0FueU1ldGhvZHMobmV4dE9yT2JzZXJ2ZXIsIFtcbiAgICAgICAgICAgICduZXh0JyxcbiAgICAgICAgICAgICdlcnJvcicsXG4gICAgICAgICAgICAnY29tcGxldGUnXG4gICAgICAgIF0pKSB7XG4gICAgICAgICAgICBvYnNlcnZlciA9IG5leHRPck9ic2VydmVyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JzZXJ2ZXIgPSB7XG4gICAgICAgICAgICAgICAgbmV4dDogbmV4dE9yT2JzZXJ2ZXIsXG4gICAgICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgICAgICAgY29tcGxldGVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9ic2VydmVyLm5leHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgb2JzZXJ2ZXIubmV4dCA9IG5vb3A7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9ic2VydmVyLmVycm9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIG9ic2VydmVyLmVycm9yID0gbm9vcDtcbiAgICAgICAgfVxuICAgICAgICBpZiAob2JzZXJ2ZXIuY29tcGxldGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUgPSBub29wO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHVuc3ViID0gdGhpcy51bnN1YnNjcmliZU9uZS5iaW5kKHRoaXMsIHRoaXMub2JzZXJ2ZXJzLmxlbmd0aCk7XG4gICAgICAgIC8vIEF0dGVtcHQgdG8gc3Vic2NyaWJlIHRvIGEgdGVybWluYXRlZCBPYnNlcnZhYmxlIC0gd2VcbiAgICAgICAgLy8ganVzdCByZXNwb25kIHRvIHRoZSBPYnNlcnZlciB3aXRoIHRoZSBmaW5hbCBlcnJvciBvciBjb21wbGV0ZVxuICAgICAgICAvLyBldmVudC5cbiAgICAgICAgaWYgKHRoaXMuZmluYWxpemVkKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWZsb2F0aW5nLXByb21pc2VzXG4gICAgICAgICAgICB0aGlzLnRhc2sudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZmluYWxFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIuZXJyb3IodGhpcy5maW5hbEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbm90aGluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9ic2VydmVycy5wdXNoKG9ic2VydmVyKTtcbiAgICAgICAgcmV0dXJuIHVuc3ViO1xuICAgIH1cbiAgICAvLyBVbnN1YnNjcmliZSBpcyBzeW5jaHJvbm91cyAtIHdlIGd1YXJhbnRlZSB0aGF0IG5vIGV2ZW50cyBhcmUgc2VudCB0b1xuICAgIC8vIGFueSB1bnN1YnNjcmliZWQgT2JzZXJ2ZXIuXG4gICAgdW5zdWJzY3JpYmVPbmUoaSkge1xuICAgICAgICBpZiAodGhpcy5vYnNlcnZlcnMgPT09IHVuZGVmaW5lZCB8fCB0aGlzLm9ic2VydmVyc1tpXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHRoaXMub2JzZXJ2ZXJzW2ldO1xuICAgICAgICB0aGlzLm9ic2VydmVyQ291bnQgLT0gMTtcbiAgICAgICAgaWYgKHRoaXMub2JzZXJ2ZXJDb3VudCA9PT0gMCAmJiB0aGlzLm9uTm9PYnNlcnZlcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5vbk5vT2JzZXJ2ZXJzKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvckVhY2hPYnNlcnZlcihmbikge1xuICAgICAgICBpZiAodGhpcy5maW5hbGl6ZWQpIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgY2xvc2VkIGJ5IHByZXZpb3VzIGV2ZW50Li4uLmp1c3QgZWF0IHRoZSBhZGRpdGlvbmFsIHZhbHVlcy5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBTaW5jZSBzZW5kT25lIGNhbGxzIGFzeW5jaHJvbm91c2x5IC0gdGhlcmUgaXMgbm8gY2hhbmNlIHRoYXRcbiAgICAgICAgLy8gdGhpcy5vYnNlcnZlcnMgd2lsbCBiZWNvbWUgdW5kZWZpbmVkLlxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMub2JzZXJ2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNlbmRPbmUoaSwgZm4pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIENhbGwgdGhlIE9ic2VydmVyIHZpYSBvbmUgb2YgaXQncyBjYWxsYmFjayBmdW5jdGlvbi4gV2UgYXJlIGNhcmVmdWwgdG9cbiAgICAvLyBjb25maXJtIHRoYXQgdGhlIG9ic2VydmUgaGFzIG5vdCBiZWVuIHVuc3Vic2NyaWJlZCBzaW5jZSB0aGlzIGFzeW5jaHJvbm91c1xuICAgIC8vIGZ1bmN0aW9uIGhhZCBiZWVuIHF1ZXVlZC5cbiAgICBzZW5kT25lKGksIGZuKSB7XG4gICAgICAgIC8vIEV4ZWN1dGUgdGhlIGNhbGxiYWNrIGFzeW5jaHJvbm91c2x5XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZmxvYXRpbmctcHJvbWlzZXNcbiAgICAgICAgdGhpcy50YXNrLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMub2JzZXJ2ZXJzICE9PSB1bmRlZmluZWQgJiYgdGhpcy5vYnNlcnZlcnNbaV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGZuKHRoaXMub2JzZXJ2ZXJzW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWdub3JlIGV4Y2VwdGlvbnMgcmFpc2VkIGluIE9ic2VydmVycyBvciBtaXNzaW5nIG1ldGhvZHMgb2YgYW5cbiAgICAgICAgICAgICAgICAgICAgLy8gT2JzZXJ2ZXIuXG4gICAgICAgICAgICAgICAgICAgIC8vIExvZyBlcnJvciB0byBjb25zb2xlLiBiLzMxNDA0ODA2XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNsb3NlKGVycikge1xuICAgICAgICBpZiAodGhpcy5maW5hbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IHRydWU7XG4gICAgICAgIGlmIChlcnIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5maW5hbEVycm9yID0gZXJyO1xuICAgICAgICB9XG4gICAgICAgIC8vIFByb3h5IGlzIG5vIGxvbmdlciBuZWVkZWQgLSBnYXJiYWdlIGNvbGxlY3QgcmVmZXJlbmNlc1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWZsb2F0aW5nLXByb21pc2VzXG4gICAgICAgIHRoaXMudGFzay50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXJzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5vbk5vT2JzZXJ2ZXJzID0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICB9XG59XG4vKiogVHVybiBzeW5jaHJvbm91cyBmdW5jdGlvbiBpbnRvIG9uZSBjYWxsZWQgYXN5bmNocm9ub3VzbHkuICovXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2Jhbi10eXBlc1xuZnVuY3Rpb24gYXN5bmMoZm4sIG9uRXJyb3IpIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBmbiguLi5hcmdzKTtcbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGlmIChvbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG59XG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHRoZSBvYmplY3QgcGFzc2VkIGluIGltcGxlbWVudHMgYW55IG9mIHRoZSBuYW1lZCBtZXRob2RzLlxuICovXG5mdW5jdGlvbiBpbXBsZW1lbnRzQW55TWV0aG9kcyhvYmosIG1ldGhvZHMpIHtcbiAgICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBtZXRob2Qgb2YgbWV0aG9kcykge1xuICAgICAgICBpZiAobWV0aG9kIGluIG9iaiAmJiB0eXBlb2Ygb2JqW21ldGhvZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIG5vb3AoKSB7XG4gICAgLy8gZG8gbm90aGluZ1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBDaGVjayB0byBtYWtlIHN1cmUgdGhlIGFwcHJvcHJpYXRlIG51bWJlciBvZiBhcmd1bWVudHMgYXJlIHByb3ZpZGVkIGZvciBhIHB1YmxpYyBmdW5jdGlvbi5cbiAqIFRocm93cyBhbiBlcnJvciBpZiBpdCBmYWlscy5cbiAqXG4gKiBAcGFyYW0gZm5OYW1lIFRoZSBmdW5jdGlvbiBuYW1lXG4gKiBAcGFyYW0gbWluQ291bnQgVGhlIG1pbmltdW0gbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBhbGxvdyBmb3IgdGhlIGZ1bmN0aW9uIGNhbGxcbiAqIEBwYXJhbSBtYXhDb3VudCBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXJndW1lbnQgdG8gYWxsb3cgZm9yIHRoZSBmdW5jdGlvbiBjYWxsXG4gKiBAcGFyYW0gYXJnQ291bnQgVGhlIGFjdHVhbCBudW1iZXIgb2YgYXJndW1lbnRzIHByb3ZpZGVkLlxuICovXG5jb25zdCB2YWxpZGF0ZUFyZ0NvdW50ID0gZnVuY3Rpb24gKGZuTmFtZSwgbWluQ291bnQsIG1heENvdW50LCBhcmdDb3VudCkge1xuICAgIGxldCBhcmdFcnJvcjtcbiAgICBpZiAoYXJnQ291bnQgPCBtaW5Db3VudCkge1xuICAgICAgICBhcmdFcnJvciA9ICdhdCBsZWFzdCAnICsgbWluQ291bnQ7XG4gICAgfVxuICAgIGVsc2UgaWYgKGFyZ0NvdW50ID4gbWF4Q291bnQpIHtcbiAgICAgICAgYXJnRXJyb3IgPSBtYXhDb3VudCA9PT0gMCA/ICdub25lJyA6ICdubyBtb3JlIHRoYW4gJyArIG1heENvdW50O1xuICAgIH1cbiAgICBpZiAoYXJnRXJyb3IpIHtcbiAgICAgICAgY29uc3QgZXJyb3IgPSBmbk5hbWUgK1xuICAgICAgICAgICAgJyBmYWlsZWQ6IFdhcyBjYWxsZWQgd2l0aCAnICtcbiAgICAgICAgICAgIGFyZ0NvdW50ICtcbiAgICAgICAgICAgIChhcmdDb3VudCA9PT0gMSA/ICcgYXJndW1lbnQuJyA6ICcgYXJndW1lbnRzLicpICtcbiAgICAgICAgICAgICcgRXhwZWN0cyAnICtcbiAgICAgICAgICAgIGFyZ0Vycm9yICtcbiAgICAgICAgICAgICcuJztcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yKTtcbiAgICB9XG59O1xuLyoqXG4gKiBHZW5lcmF0ZXMgYSBzdHJpbmcgdG8gcHJlZml4IGFuIGVycm9yIG1lc3NhZ2UgYWJvdXQgZmFpbGVkIGFyZ3VtZW50IHZhbGlkYXRpb25cbiAqXG4gKiBAcGFyYW0gZm5OYW1lIFRoZSBmdW5jdGlvbiBuYW1lXG4gKiBAcGFyYW0gYXJnTmFtZSBUaGUgbmFtZSBvZiB0aGUgYXJndW1lbnRcbiAqIEByZXR1cm4gVGhlIHByZWZpeCB0byBhZGQgdG8gdGhlIGVycm9yIHRocm93biBmb3IgdmFsaWRhdGlvbi5cbiAqL1xuZnVuY3Rpb24gZXJyb3JQcmVmaXgoZm5OYW1lLCBhcmdOYW1lKSB7XG4gICAgcmV0dXJuIGAke2ZuTmFtZX0gZmFpbGVkOiAke2FyZ05hbWV9IGFyZ3VtZW50IGA7XG59XG4vKipcbiAqIEBwYXJhbSBmbk5hbWVcbiAqIEBwYXJhbSBhcmd1bWVudE51bWJlclxuICogQHBhcmFtIG5hbWVzcGFjZVxuICogQHBhcmFtIG9wdGlvbmFsXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlTmFtZXNwYWNlKGZuTmFtZSwgbmFtZXNwYWNlLCBvcHRpb25hbCkge1xuICAgIGlmIChvcHRpb25hbCAmJiAhbmFtZXNwYWNlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBuYW1lc3BhY2UgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIC8vVE9ETzogSSBzaG91bGQgZG8gbW9yZSB2YWxpZGF0aW9uIGhlcmUuIFdlIG9ubHkgYWxsb3cgY2VydGFpbiBjaGFycyBpbiBuYW1lc3BhY2VzLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JQcmVmaXgoZm5OYW1lLCAnbmFtZXNwYWNlJykgKyAnbXVzdCBiZSBhIHZhbGlkIGZpcmViYXNlIG5hbWVzcGFjZS4nKTtcbiAgICB9XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUNhbGxiYWNrKGZuTmFtZSwgYXJndW1lbnROYW1lLCBcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXR5cGVzXG5jYWxsYmFjaywgb3B0aW9uYWwpIHtcbiAgICBpZiAob3B0aW9uYWwgJiYgIWNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JQcmVmaXgoZm5OYW1lLCBhcmd1bWVudE5hbWUpICsgJ211c3QgYmUgYSB2YWxpZCBmdW5jdGlvbi4nKTtcbiAgICB9XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUNvbnRleHRPYmplY3QoZm5OYW1lLCBhcmd1bWVudE5hbWUsIGNvbnRleHQsIG9wdGlvbmFsKSB7XG4gICAgaWYgKG9wdGlvbmFsICYmICFjb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ICE9PSAnb2JqZWN0JyB8fCBjb250ZXh0ID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvclByZWZpeChmbk5hbWUsIGFyZ3VtZW50TmFtZSkgKyAnbXVzdCBiZSBhIHZhbGlkIGNvbnRleHQgb2JqZWN0LicpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8vIENvZGUgb3JpZ2luYWxseSBjYW1lIGZyb20gZ29vZy5jcnlwdC5zdHJpbmdUb1V0ZjhCeXRlQXJyYXksIGJ1dCBmb3Igc29tZSByZWFzb24gdGhleVxuLy8gYXV0b21hdGljYWxseSByZXBsYWNlZCAnXFxyXFxuJyB3aXRoICdcXG4nLCBhbmQgdGhleSBkaWRuJ3QgaGFuZGxlIHN1cnJvZ2F0ZSBwYWlycyxcbi8vIHNvIGl0J3MgYmVlbiBtb2RpZmllZC5cbi8vIE5vdGUgdGhhdCBub3QgYWxsIFVuaWNvZGUgY2hhcmFjdGVycyBhcHBlYXIgYXMgc2luZ2xlIGNoYXJhY3RlcnMgaW4gSmF2YVNjcmlwdCBzdHJpbmdzLlxuLy8gZnJvbUNoYXJDb2RlIHJldHVybnMgdGhlIFVURi0xNiBlbmNvZGluZyBvZiBhIGNoYXJhY3RlciAtIHNvIHNvbWUgVW5pY29kZSBjaGFyYWN0ZXJzXG4vLyB1c2UgMiBjaGFyYWN0ZXJzIGluIEphdmFTY3JpcHQuICBBbGwgNC1ieXRlIFVURi04IGNoYXJhY3RlcnMgYmVnaW4gd2l0aCBhIGZpcnN0XG4vLyBjaGFyYWN0ZXIgaW4gdGhlIHJhbmdlIDB4RDgwMCAtIDB4REJGRiAodGhlIGZpcnN0IGNoYXJhY3RlciBvZiBhIHNvLWNhbGxlZCBzdXJyb2dhdGVcbi8vIHBhaXIpLlxuLy8gU2VlIGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi81LjEvI3NlYy0xNS4xLjNcbi8qKlxuICogQHBhcmFtIHtzdHJpbmd9IHN0clxuICogQHJldHVybiB7QXJyYXl9XG4gKi9cbmNvbnN0IHN0cmluZ1RvQnl0ZUFycmF5ID0gZnVuY3Rpb24gKHN0cikge1xuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGxldCBwID0gMDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgYyA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICAvLyBJcyB0aGlzIHRoZSBsZWFkIHN1cnJvZ2F0ZSBpbiBhIHN1cnJvZ2F0ZSBwYWlyP1xuICAgICAgICBpZiAoYyA+PSAweGQ4MDAgJiYgYyA8PSAweGRiZmYpIHtcbiAgICAgICAgICAgIGNvbnN0IGhpZ2ggPSBjIC0gMHhkODAwOyAvLyB0aGUgaGlnaCAxMCBiaXRzLlxuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgYXNzZXJ0KGkgPCBzdHIubGVuZ3RoLCAnU3Vycm9nYXRlIHBhaXIgbWlzc2luZyB0cmFpbCBzdXJyb2dhdGUuJyk7XG4gICAgICAgICAgICBjb25zdCBsb3cgPSBzdHIuY2hhckNvZGVBdChpKSAtIDB4ZGMwMDsgLy8gdGhlIGxvdyAxMCBiaXRzLlxuICAgICAgICAgICAgYyA9IDB4MTAwMDAgKyAoaGlnaCA8PCAxMCkgKyBsb3c7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGMgPCAxMjgpIHtcbiAgICAgICAgICAgIG91dFtwKytdID0gYztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjIDwgMjA0OCkge1xuICAgICAgICAgICAgb3V0W3ArK10gPSAoYyA+PiA2KSB8IDE5MjtcbiAgICAgICAgICAgIG91dFtwKytdID0gKGMgJiA2MykgfCAxMjg7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYyA8IDY1NTM2KSB7XG4gICAgICAgICAgICBvdXRbcCsrXSA9IChjID4+IDEyKSB8IDIyNDtcbiAgICAgICAgICAgIG91dFtwKytdID0gKChjID4+IDYpICYgNjMpIHwgMTI4O1xuICAgICAgICAgICAgb3V0W3ArK10gPSAoYyAmIDYzKSB8IDEyODtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG91dFtwKytdID0gKGMgPj4gMTgpIHwgMjQwO1xuICAgICAgICAgICAgb3V0W3ArK10gPSAoKGMgPj4gMTIpICYgNjMpIHwgMTI4O1xuICAgICAgICAgICAgb3V0W3ArK10gPSAoKGMgPj4gNikgJiA2MykgfCAxMjg7XG4gICAgICAgICAgICBvdXRbcCsrXSA9IChjICYgNjMpIHwgMTI4O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG59O1xuLyoqXG4gKiBDYWxjdWxhdGUgbGVuZ3RoIHdpdGhvdXQgYWN0dWFsbHkgY29udmVydGluZzsgdXNlZnVsIGZvciBkb2luZyBjaGVhcGVyIHZhbGlkYXRpb24uXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtudW1iZXJ9XG4gKi9cbmNvbnN0IHN0cmluZ0xlbmd0aCA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICBsZXQgcCA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgYyA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBpZiAoYyA8IDEyOCkge1xuICAgICAgICAgICAgcCsrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGMgPCAyMDQ4KSB7XG4gICAgICAgICAgICBwICs9IDI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYyA+PSAweGQ4MDAgJiYgYyA8PSAweGRiZmYpIHtcbiAgICAgICAgICAgIC8vIExlYWQgc3Vycm9nYXRlIG9mIGEgc3Vycm9nYXRlIHBhaXIuICBUaGUgcGFpciB0b2dldGhlciB3aWxsIHRha2UgNCBieXRlcyB0byByZXByZXNlbnQuXG4gICAgICAgICAgICBwICs9IDQ7XG4gICAgICAgICAgICBpKys7IC8vIHNraXAgdHJhaWwgc3Vycm9nYXRlLlxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcCArPSAzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwO1xufTtcblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogVGhlIGFtb3VudCBvZiBtaWxsaXNlY29uZHMgdG8gZXhwb25lbnRpYWxseSBpbmNyZWFzZS5cbiAqL1xuY29uc3QgREVGQVVMVF9JTlRFUlZBTF9NSUxMSVMgPSAxMDAwO1xuLyoqXG4gKiBUaGUgZmFjdG9yIHRvIGJhY2tvZmYgYnkuXG4gKiBTaG91bGQgYmUgYSBudW1iZXIgZ3JlYXRlciB0aGFuIDEuXG4gKi9cbmNvbnN0IERFRkFVTFRfQkFDS09GRl9GQUNUT1IgPSAyO1xuLyoqXG4gKiBUaGUgbWF4aW11bSBtaWxsaXNlY29uZHMgdG8gaW5jcmVhc2UgdG8uXG4gKlxuICogPHA+VmlzaWJsZSBmb3IgdGVzdGluZ1xuICovXG5jb25zdCBNQVhfVkFMVUVfTUlMTElTID0gNCAqIDYwICogNjAgKiAxMDAwOyAvLyBGb3VyIGhvdXJzLCBsaWtlIGlPUyBhbmQgQW5kcm9pZC5cbi8qKlxuICogVGhlIHBlcmNlbnRhZ2Ugb2YgYmFja29mZiB0aW1lIHRvIHJhbmRvbWl6ZSBieS5cbiAqIFNlZVxuICogaHR0cDovL2dvL3NhZmUtY2xpZW50LWJlaGF2aW9yI3N0ZXAtMS1kZXRlcm1pbmUtdGhlLWFwcHJvcHJpYXRlLXJldHJ5LWludGVydmFsLXRvLWhhbmRsZS1zcGlrZS10cmFmZmljXG4gKiBmb3IgY29udGV4dC5cbiAqXG4gKiA8cD5WaXNpYmxlIGZvciB0ZXN0aW5nXG4gKi9cbmNvbnN0IFJBTkRPTV9GQUNUT1IgPSAwLjU7XG4vKipcbiAqIEJhc2VkIG9uIHRoZSBiYWNrb2ZmIG1ldGhvZCBmcm9tXG4gKiBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL2Nsb3N1cmUtbGlicmFyeS9ibG9iL21hc3Rlci9jbG9zdXJlL2dvb2cvbWF0aC9leHBvbmVudGlhbGJhY2tvZmYuanMuXG4gKiBFeHRyYWN0ZWQgaGVyZSBzbyB3ZSBkb24ndCBuZWVkIHRvIHBhc3MgbWV0YWRhdGEgYW5kIGEgc3RhdGVmdWwgRXhwb25lbnRpYWxCYWNrb2ZmIG9iamVjdCBhcm91bmQuXG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZUJhY2tvZmZNaWxsaXMoYmFja29mZkNvdW50LCBpbnRlcnZhbE1pbGxpcyA9IERFRkFVTFRfSU5URVJWQUxfTUlMTElTLCBiYWNrb2ZmRmFjdG9yID0gREVGQVVMVF9CQUNLT0ZGX0ZBQ1RPUikge1xuICAgIC8vIENhbGN1bGF0ZXMgYW4gZXhwb25lbnRpYWxseSBpbmNyZWFzaW5nIHZhbHVlLlxuICAgIC8vIERldmlhdGlvbjogY2FsY3VsYXRlcyB2YWx1ZSBmcm9tIGNvdW50IGFuZCBhIGNvbnN0YW50IGludGVydmFsLCBzbyB3ZSBvbmx5IG5lZWQgdG8gc2F2ZSB2YWx1ZVxuICAgIC8vIGFuZCBjb3VudCB0byByZXN0b3JlIHN0YXRlLlxuICAgIGNvbnN0IGN1cnJCYXNlVmFsdWUgPSBpbnRlcnZhbE1pbGxpcyAqIE1hdGgucG93KGJhY2tvZmZGYWN0b3IsIGJhY2tvZmZDb3VudCk7XG4gICAgLy8gQSByYW5kb20gXCJmdXp6XCIgdG8gYXZvaWQgd2F2ZXMgb2YgcmV0cmllcy5cbiAgICAvLyBEZXZpYXRpb246IHJhbmRvbUZhY3RvciBpcyByZXF1aXJlZC5cbiAgICBjb25zdCByYW5kb21XYWl0ID0gTWF0aC5yb3VuZChcbiAgICAvLyBBIGZyYWN0aW9uIG9mIHRoZSBiYWNrb2ZmIHZhbHVlIHRvIGFkZC9zdWJ0cmFjdC5cbiAgICAvLyBEZXZpYXRpb246IGNoYW5nZXMgbXVsdGlwbGljYXRpb24gb3JkZXIgdG8gaW1wcm92ZSByZWFkYWJpbGl0eS5cbiAgICBSQU5ET01fRkFDVE9SICpcbiAgICAgICAgY3VyckJhc2VWYWx1ZSAqXG4gICAgICAgIC8vIEEgcmFuZG9tIGZsb2F0IChyb3VuZGVkIHRvIGludCBieSBNYXRoLnJvdW5kIGFib3ZlKSBpbiB0aGUgcmFuZ2UgWy0xLCAxXS4gRGV0ZXJtaW5lc1xuICAgICAgICAvLyBpZiB3ZSBhZGQgb3Igc3VidHJhY3QuXG4gICAgICAgIChNYXRoLnJhbmRvbSgpIC0gMC41KSAqXG4gICAgICAgIDIpO1xuICAgIC8vIExpbWl0cyBiYWNrb2ZmIHRvIG1heCB0byBhdm9pZCBlZmZlY3RpdmVseSBwZXJtYW5lbnQgYmFja29mZi5cbiAgICByZXR1cm4gTWF0aC5taW4oTUFYX1ZBTFVFX01JTExJUywgY3VyckJhc2VWYWx1ZSArIHJhbmRvbVdhaXQpO1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBQcm92aWRlIEVuZ2xpc2ggb3JkaW5hbCBsZXR0ZXJzIGFmdGVyIGEgbnVtYmVyXG4gKi9cbmZ1bmN0aW9uIG9yZGluYWwoaSkge1xuICAgIGlmICghTnVtYmVyLmlzRmluaXRlKGkpKSB7XG4gICAgICAgIHJldHVybiBgJHtpfWA7XG4gICAgfVxuICAgIHJldHVybiBpICsgaW5kaWNhdG9yKGkpO1xufVxuZnVuY3Rpb24gaW5kaWNhdG9yKGkpIHtcbiAgICBpID0gTWF0aC5hYnMoaSk7XG4gICAgY29uc3QgY2VudCA9IGkgJSAxMDA7XG4gICAgaWYgKGNlbnQgPj0gMTAgJiYgY2VudCA8PSAyMCkge1xuICAgICAgICByZXR1cm4gJ3RoJztcbiAgICB9XG4gICAgY29uc3QgZGVjID0gaSAlIDEwO1xuICAgIGlmIChkZWMgPT09IDEpIHtcbiAgICAgICAgcmV0dXJuICdzdCc7XG4gICAgfVxuICAgIGlmIChkZWMgPT09IDIpIHtcbiAgICAgICAgcmV0dXJuICduZCc7XG4gICAgfVxuICAgIGlmIChkZWMgPT09IDMpIHtcbiAgICAgICAgcmV0dXJuICdyZCc7XG4gICAgfVxuICAgIHJldHVybiAndGgnO1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuZnVuY3Rpb24gZ2V0TW9kdWxhckluc3RhbmNlKHNlcnZpY2UpIHtcbiAgICBpZiAoc2VydmljZSAmJiBzZXJ2aWNlLl9kZWxlZ2F0ZSkge1xuICAgICAgICByZXR1cm4gc2VydmljZS5fZGVsZWdhdGU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gc2VydmljZTtcbiAgICB9XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDI1IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBwdWJsaWNcbiAqIEdlbmVyYXRlcyBhIFNIQS0yNTYgaGFzaCBmb3IgdGhlIGdpdmVuIGlucHV0IHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgVGhlIHN0cmluZyB0byBoYXNoLlxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gdGhlIFNIQS0yNTYgaGFzaCBhcyBhIGhleCBzdHJpbmcuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlU0hBMjU2SGFzaChpbnB1dCkge1xuICAgIGNvbnN0IHRleHRFbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gICAgY29uc3QgZGF0YSA9IHRleHRFbmNvZGVyLmVuY29kZShpbnB1dCk7XG4gICAgY29uc3QgaGFzaEJ1ZmZlciA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZGlnZXN0KCdTSEEtMjU2JywgZGF0YSk7XG4gICAgLy8gQ29udmVydCBBcnJheUJ1ZmZlciB0byBoZXggc3RyaW5nXG4gICAgY29uc3QgaGFzaEFycmF5ID0gQXJyYXkuZnJvbShuZXcgVWludDhBcnJheShoYXNoQnVmZmVyKSk7XG4gICAgY29uc3QgaGV4SGFzaCA9IGhhc2hBcnJheS5tYXAoYiA9PiBiLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpKS5qb2luKCcnKTtcbiAgICByZXR1cm4gaGV4SGFzaDtcbn1cblxuZXhwb3J0IHsgQ09OU1RBTlRTLCBEZWNvZGVCYXNlNjRTdHJpbmdFcnJvciwgRGVmZXJyZWQsIEVycm9yRmFjdG9yeSwgRmlyZWJhc2VFcnJvciwgTUFYX1ZBTFVFX01JTExJUywgUkFORE9NX0ZBQ1RPUiwgU2hhMSwgYXJlQ29va2llc0VuYWJsZWQsIGFzc2VydCwgYXNzZXJ0aW9uRXJyb3IsIGFzeW5jLCBiYXNlNjQsIGJhc2U2NERlY29kZSwgYmFzZTY0RW5jb2RlLCBiYXNlNjR1cmxFbmNvZGVXaXRob3V0UGFkZGluZywgY2FsY3VsYXRlQmFja29mZk1pbGxpcywgY29udGFpbnMsIGNyZWF0ZU1vY2tVc2VyVG9rZW4sIGNyZWF0ZVN1YnNjcmliZSwgZGVjb2RlLCBkZWVwQ29weSwgZGVlcEVxdWFsLCBkZWVwRXh0ZW5kLCBlcnJvclByZWZpeCwgZXh0cmFjdFF1ZXJ5c3RyaW5nLCBnZW5lcmF0ZVNIQTI1Nkhhc2gsIGdldERlZmF1bHRBcHBDb25maWcsIGdldERlZmF1bHRFbXVsYXRvckhvc3QsIGdldERlZmF1bHRFbXVsYXRvckhvc3RuYW1lQW5kUG9ydCwgZ2V0RGVmYXVsdHMsIGdldEV4cGVyaW1lbnRhbFNldHRpbmcsIGdldEdsb2JhbCwgZ2V0TW9kdWxhckluc3RhbmNlLCBnZXRVQSwgaXNBZG1pbiwgaXNCcm93c2VyLCBpc0Jyb3dzZXJFeHRlbnNpb24sIGlzQ2xvdWRXb3Jrc3RhdGlvbiwgaXNDbG91ZGZsYXJlV29ya2VyLCBpc0VsZWN0cm9uLCBpc0VtcHR5LCBpc0lFLCBpc0luZGV4ZWREQkF2YWlsYWJsZSwgaXNNb2JpbGVDb3Jkb3ZhLCBpc05vZGUsIGlzTm9kZVNkaywgaXNSZWFjdE5hdGl2ZSwgaXNTYWZhcmksIGlzU2FmYXJpT3JXZWJraXQsIGlzVVdQLCBpc1ZhbGlkRm9ybWF0LCBpc1ZhbGlkVGltZXN0YW1wLCBpc1dlYldvcmtlciwgaXNzdWVkQXRUaW1lLCBqc29uRXZhbCwgbWFwLCBvcmRpbmFsLCBwaW5nU2VydmVyLCBwcm9taXNlV2l0aFRpbWVvdXQsIHF1ZXJ5c3RyaW5nLCBxdWVyeXN0cmluZ0RlY29kZSwgc2FmZUdldCwgc3RyaW5nTGVuZ3RoLCBzdHJpbmdUb0J5dGVBcnJheSwgc3RyaW5naWZ5LCB1cGRhdGVFbXVsYXRvckJhbm5lciwgdmFsaWRhdGVBcmdDb3VudCwgdmFsaWRhdGVDYWxsYmFjaywgdmFsaWRhdGVDb250ZXh0T2JqZWN0LCB2YWxpZGF0ZUluZGV4ZWREQk9wZW5hYmxlLCB2YWxpZGF0ZU5hbWVzcGFjZSB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguZXNtLmpzLm1hcFxuIiwiaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAZmlyZWJhc2UvdXRpbCc7XG5cbi8qKlxuICogQ29tcG9uZW50IGZvciBzZXJ2aWNlIG5hbWUgVCwgZS5nLiBgYXV0aGAsIGBhdXRoLWludGVybmFsYFxuICovXG5jbGFzcyBDb21wb25lbnQge1xuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWUgVGhlIHB1YmxpYyBzZXJ2aWNlIG5hbWUsIGUuZy4gYXBwLCBhdXRoLCBmaXJlc3RvcmUsIGRhdGFiYXNlXG4gICAgICogQHBhcmFtIGluc3RhbmNlRmFjdG9yeSBTZXJ2aWNlIGZhY3RvcnkgcmVzcG9uc2libGUgZm9yIGNyZWF0aW5nIHRoZSBwdWJsaWMgaW50ZXJmYWNlXG4gICAgICogQHBhcmFtIHR5cGUgd2hldGhlciB0aGUgc2VydmljZSBwcm92aWRlZCBieSB0aGUgY29tcG9uZW50IGlzIHB1YmxpYyBvciBwcml2YXRlXG4gICAgICovXG4gICAgY29uc3RydWN0b3IobmFtZSwgaW5zdGFuY2VGYWN0b3J5LCB0eXBlKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuaW5zdGFuY2VGYWN0b3J5ID0gaW5zdGFuY2VGYWN0b3J5O1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLm11bHRpcGxlSW5zdGFuY2VzID0gZmFsc2U7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcm9wZXJ0aWVzIHRvIGJlIGFkZGVkIHRvIHRoZSBzZXJ2aWNlIG5hbWVzcGFjZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXJ2aWNlUHJvcHMgPSB7fTtcbiAgICAgICAgdGhpcy5pbnN0YW50aWF0aW9uTW9kZSA9IFwiTEFaWVwiIC8qIEluc3RhbnRpYXRpb25Nb2RlLkxBWlkgKi87XG4gICAgICAgIHRoaXMub25JbnN0YW5jZUNyZWF0ZWQgPSBudWxsO1xuICAgIH1cbiAgICBzZXRJbnN0YW50aWF0aW9uTW9kZShtb2RlKSB7XG4gICAgICAgIHRoaXMuaW5zdGFudGlhdGlvbk1vZGUgPSBtb2RlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgc2V0TXVsdGlwbGVJbnN0YW5jZXMobXVsdGlwbGVJbnN0YW5jZXMpIHtcbiAgICAgICAgdGhpcy5tdWx0aXBsZUluc3RhbmNlcyA9IG11bHRpcGxlSW5zdGFuY2VzO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgc2V0U2VydmljZVByb3BzKHByb3BzKSB7XG4gICAgICAgIHRoaXMuc2VydmljZVByb3BzID0gcHJvcHM7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBzZXRJbnN0YW5jZUNyZWF0ZWRDYWxsYmFjayhjYWxsYmFjaykge1xuICAgICAgICB0aGlzLm9uSW5zdGFuY2VDcmVhdGVkID0gY2FsbGJhY2s7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmNvbnN0IERFRkFVTFRfRU5UUllfTkFNRSA9ICdbREVGQVVMVF0nO1xuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBQcm92aWRlciBmb3IgaW5zdGFuY2UgZm9yIHNlcnZpY2UgbmFtZSBULCBlLmcuICdhdXRoJywgJ2F1dGgtaW50ZXJuYWwnXG4gKiBOYW1lU2VydmljZU1hcHBpbmdbVF0gaXMgYW4gYWxpYXMgZm9yIHRoZSB0eXBlIG9mIHRoZSBpbnN0YW5jZVxuICovXG5jbGFzcyBQcm92aWRlciB7XG4gICAgY29uc3RydWN0b3IobmFtZSwgY29udGFpbmVyKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyO1xuICAgICAgICB0aGlzLmNvbXBvbmVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuaW5zdGFuY2VzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLmluc3RhbmNlc0RlZmVycmVkID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLmluc3RhbmNlc09wdGlvbnMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMub25Jbml0Q2FsbGJhY2tzID0gbmV3IE1hcCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAcGFyYW0gaWRlbnRpZmllciBBIHByb3ZpZGVyIGNhbiBwcm92aWRlIG11bHRpcGxlIGluc3RhbmNlcyBvZiBhIHNlcnZpY2VcbiAgICAgKiBpZiB0aGlzLmNvbXBvbmVudC5tdWx0aXBsZUluc3RhbmNlcyBpcyB0cnVlLlxuICAgICAqL1xuICAgIGdldChpZGVudGlmaWVyKSB7XG4gICAgICAgIC8vIGlmIG11bHRpcGxlSW5zdGFuY2VzIGlzIG5vdCBzdXBwb3J0ZWQsIHVzZSB0aGUgZGVmYXVsdCBuYW1lXG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRJZGVudGlmaWVyID0gdGhpcy5ub3JtYWxpemVJbnN0YW5jZUlkZW50aWZpZXIoaWRlbnRpZmllcik7XG4gICAgICAgIGlmICghdGhpcy5pbnN0YW5jZXNEZWZlcnJlZC5oYXMobm9ybWFsaXplZElkZW50aWZpZXIpKSB7XG4gICAgICAgICAgICBjb25zdCBkZWZlcnJlZCA9IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZXNEZWZlcnJlZC5zZXQobm9ybWFsaXplZElkZW50aWZpZXIsIGRlZmVycmVkKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQobm9ybWFsaXplZElkZW50aWZpZXIpIHx8XG4gICAgICAgICAgICAgICAgdGhpcy5zaG91bGRBdXRvSW5pdGlhbGl6ZSgpKSB7XG4gICAgICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZSB0aGUgc2VydmljZSBpZiBpdCBjYW4gYmUgYXV0by1pbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5nZXRPckluaXRpYWxpemVTZXJ2aWNlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlSWRlbnRpZmllcjogbm9ybWFsaXplZElkZW50aWZpZXJcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gd2hlbiB0aGUgaW5zdGFuY2UgZmFjdG9yeSB0aHJvd3MgYW4gZXhjZXB0aW9uIGR1cmluZyBnZXQoKSwgaXQgc2hvdWxkIG5vdCBjYXVzZVxuICAgICAgICAgICAgICAgICAgICAvLyBhIGZhdGFsIGVycm9yLiBXZSBqdXN0IHJldHVybiB0aGUgdW5yZXNvbHZlZCBwcm9taXNlIGluIHRoaXMgY2FzZS5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5zdGFuY2VzRGVmZXJyZWQuZ2V0KG5vcm1hbGl6ZWRJZGVudGlmaWVyKS5wcm9taXNlO1xuICAgIH1cbiAgICBnZXRJbW1lZGlhdGUob3B0aW9ucykge1xuICAgICAgICAvLyBpZiBtdWx0aXBsZUluc3RhbmNlcyBpcyBub3Qgc3VwcG9ydGVkLCB1c2UgdGhlIGRlZmF1bHQgbmFtZVxuICAgICAgICBjb25zdCBub3JtYWxpemVkSWRlbnRpZmllciA9IHRoaXMubm9ybWFsaXplSW5zdGFuY2VJZGVudGlmaWVyKG9wdGlvbnM/LmlkZW50aWZpZXIpO1xuICAgICAgICBjb25zdCBvcHRpb25hbCA9IG9wdGlvbnM/Lm9wdGlvbmFsID8/IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkKG5vcm1hbGl6ZWRJZGVudGlmaWVyKSB8fFxuICAgICAgICAgICAgdGhpcy5zaG91bGRBdXRvSW5pdGlhbGl6ZSgpKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE9ySW5pdGlhbGl6ZVNlcnZpY2Uoe1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZUlkZW50aWZpZXI6IG5vcm1hbGl6ZWRJZGVudGlmaWVyXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25hbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gSW4gY2FzZSBhIGNvbXBvbmVudCBpcyBub3QgaW5pdGlhbGl6ZWQgYW5kIHNob3VsZC9jYW5ub3QgYmUgYXV0by1pbml0aWFsaXplZCBhdCB0aGUgbW9tZW50LCByZXR1cm4gbnVsbCBpZiB0aGUgb3B0aW9uYWwgZmxhZyBpcyBzZXQsIG9yIHRocm93XG4gICAgICAgICAgICBpZiAob3B0aW9uYWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKGBTZXJ2aWNlICR7dGhpcy5uYW1lfSBpcyBub3QgYXZhaWxhYmxlYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2V0Q29tcG9uZW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb21wb25lbnQ7XG4gICAgfVxuICAgIHNldENvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICAgICAgaWYgKGNvbXBvbmVudC5uYW1lICE9PSB0aGlzLm5hbWUpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGBNaXNtYXRjaGluZyBDb21wb25lbnQgJHtjb21wb25lbnQubmFtZX0gZm9yIFByb3ZpZGVyICR7dGhpcy5uYW1lfS5gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5jb21wb25lbnQpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGBDb21wb25lbnQgZm9yICR7dGhpcy5uYW1lfSBoYXMgYWxyZWFkeSBiZWVuIHByb3ZpZGVkYCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb21wb25lbnQgPSBjb21wb25lbnQ7XG4gICAgICAgIC8vIHJldHVybiBlYXJseSB3aXRob3V0IGF0dGVtcHRpbmcgdG8gaW5pdGlhbGl6ZSB0aGUgY29tcG9uZW50IGlmIHRoZSBjb21wb25lbnQgcmVxdWlyZXMgZXhwbGljaXQgaW5pdGlhbGl6YXRpb24gKGNhbGxpbmcgYFByb3ZpZGVyLmluaXRpYWxpemUoKWApXG4gICAgICAgIGlmICghdGhpcy5zaG91bGRBdXRvSW5pdGlhbGl6ZSgpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgdGhlIHNlcnZpY2UgaXMgZWFnZXIsIGluaXRpYWxpemUgdGhlIGRlZmF1bHQgaW5zdGFuY2VcbiAgICAgICAgaWYgKGlzQ29tcG9uZW50RWFnZXIoY29tcG9uZW50KSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLmdldE9ySW5pdGlhbGl6ZVNlcnZpY2UoeyBpbnN0YW5jZUlkZW50aWZpZXI6IERFRkFVTFRfRU5UUllfTkFNRSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gd2hlbiB0aGUgaW5zdGFuY2UgZmFjdG9yeSBmb3IgYW4gZWFnZXIgQ29tcG9uZW50IHRocm93cyBhbiBleGNlcHRpb24gZHVyaW5nIHRoZSBlYWdlclxuICAgICAgICAgICAgICAgIC8vIGluaXRpYWxpemF0aW9uLCBpdCBzaG91bGQgbm90IGNhdXNlIGEgZmF0YWwgZXJyb3IuXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogSW52ZXN0aWdhdGUgaWYgd2UgbmVlZCB0byBtYWtlIGl0IGNvbmZpZ3VyYWJsZSwgYmVjYXVzZSBzb21lIGNvbXBvbmVudCBtYXkgd2FudCB0byBjYXVzZVxuICAgICAgICAgICAgICAgIC8vIGEgZmF0YWwgZXJyb3IgaW4gdGhpcyBjYXNlP1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIENyZWF0ZSBzZXJ2aWNlIGluc3RhbmNlcyBmb3IgdGhlIHBlbmRpbmcgcHJvbWlzZXMgYW5kIHJlc29sdmUgdGhlbVxuICAgICAgICAvLyBOT1RFOiBpZiB0aGlzLm11bHRpcGxlSW5zdGFuY2VzIGlzIGZhbHNlLCBvbmx5IHRoZSBkZWZhdWx0IGluc3RhbmNlIHdpbGwgYmUgY3JlYXRlZFxuICAgICAgICAvLyBhbmQgYWxsIHByb21pc2VzIHdpdGggcmVzb2x2ZSB3aXRoIGl0IHJlZ2FyZGxlc3Mgb2YgdGhlIGlkZW50aWZpZXIuXG4gICAgICAgIGZvciAoY29uc3QgW2luc3RhbmNlSWRlbnRpZmllciwgaW5zdGFuY2VEZWZlcnJlZF0gb2YgdGhpcy5pbnN0YW5jZXNEZWZlcnJlZC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRJZGVudGlmaWVyID0gdGhpcy5ub3JtYWxpemVJbnN0YW5jZUlkZW50aWZpZXIoaW5zdGFuY2VJZGVudGlmaWVyKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gYGdldE9ySW5pdGlhbGl6ZVNlcnZpY2UoKWAgc2hvdWxkIGFsd2F5cyByZXR1cm4gYSB2YWxpZCBpbnN0YW5jZSBzaW5jZSBhIGNvbXBvbmVudCBpcyBndWFyYW50ZWVkLiB1c2UgISB0byBtYWtlIHR5cGVzY3JpcHQgaGFwcHkuXG4gICAgICAgICAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmdldE9ySW5pdGlhbGl6ZVNlcnZpY2Uoe1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZUlkZW50aWZpZXI6IG5vcm1hbGl6ZWRJZGVudGlmaWVyXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2VEZWZlcnJlZC5yZXNvbHZlKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gd2hlbiB0aGUgaW5zdGFuY2UgZmFjdG9yeSB0aHJvd3MgYW4gZXhjZXB0aW9uLCBpdCBzaG91bGQgbm90IGNhdXNlXG4gICAgICAgICAgICAgICAgLy8gYSBmYXRhbCBlcnJvci4gV2UganVzdCBsZWF2ZSB0aGUgcHJvbWlzZSB1bnJlc29sdmVkLlxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGNsZWFySW5zdGFuY2UoaWRlbnRpZmllciA9IERFRkFVTFRfRU5UUllfTkFNRSkge1xuICAgICAgICB0aGlzLmluc3RhbmNlc0RlZmVycmVkLmRlbGV0ZShpZGVudGlmaWVyKTtcbiAgICAgICAgdGhpcy5pbnN0YW5jZXNPcHRpb25zLmRlbGV0ZShpZGVudGlmaWVyKTtcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZGVsZXRlKGlkZW50aWZpZXIpO1xuICAgIH1cbiAgICAvLyBhcHAuZGVsZXRlKCkgd2lsbCBjYWxsIHRoaXMgbWV0aG9kIG9uIGV2ZXJ5IHByb3ZpZGVyIHRvIGRlbGV0ZSB0aGUgc2VydmljZXNcbiAgICAvLyBUT0RPOiBzaG91bGQgd2UgbWFyayB0aGUgcHJvdmlkZXIgYXMgZGVsZXRlZD9cbiAgICBhc3luYyBkZWxldGUoKSB7XG4gICAgICAgIGNvbnN0IHNlcnZpY2VzID0gQXJyYXkuZnJvbSh0aGlzLmluc3RhbmNlcy52YWx1ZXMoKSk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIC4uLnNlcnZpY2VzXG4gICAgICAgICAgICAgICAgLmZpbHRlcihzZXJ2aWNlID0+ICdJTlRFUk5BTCcgaW4gc2VydmljZSkgLy8gbGVnYWN5IHNlcnZpY2VzXG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAgICAgICAubWFwKHNlcnZpY2UgPT4gc2VydmljZS5JTlRFUk5BTC5kZWxldGUoKSksXG4gICAgICAgICAgICAuLi5zZXJ2aWNlc1xuICAgICAgICAgICAgICAgIC5maWx0ZXIoc2VydmljZSA9PiAnX2RlbGV0ZScgaW4gc2VydmljZSkgLy8gbW9kdWxhcml6ZWQgc2VydmljZXNcbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgICAgICAgIC5tYXAoc2VydmljZSA9PiBzZXJ2aWNlLl9kZWxldGUoKSlcbiAgICAgICAgXSk7XG4gICAgfVxuICAgIGlzQ29tcG9uZW50U2V0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb21wb25lbnQgIT0gbnVsbDtcbiAgICB9XG4gICAgaXNJbml0aWFsaXplZChpZGVudGlmaWVyID0gREVGQVVMVF9FTlRSWV9OQU1FKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlcy5oYXMoaWRlbnRpZmllcik7XG4gICAgfVxuICAgIGdldE9wdGlvbnMoaWRlbnRpZmllciA9IERFRkFVTFRfRU5UUllfTkFNRSkge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZXNPcHRpb25zLmdldChpZGVudGlmaWVyKSB8fCB7fTtcbiAgICB9XG4gICAgaW5pdGlhbGl6ZShvcHRzID0ge30pIHtcbiAgICAgICAgY29uc3QgeyBvcHRpb25zID0ge30gfSA9IG9wdHM7XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRJZGVudGlmaWVyID0gdGhpcy5ub3JtYWxpemVJbnN0YW5jZUlkZW50aWZpZXIob3B0cy5pbnN0YW5jZUlkZW50aWZpZXIpO1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkKG5vcm1hbGl6ZWRJZGVudGlmaWVyKSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoYCR7dGhpcy5uYW1lfSgke25vcm1hbGl6ZWRJZGVudGlmaWVyfSkgaGFzIGFscmVhZHkgYmVlbiBpbml0aWFsaXplZGApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5pc0NvbXBvbmVudFNldCgpKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihgQ29tcG9uZW50ICR7dGhpcy5uYW1lfSBoYXMgbm90IGJlZW4gcmVnaXN0ZXJlZCB5ZXRgKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuZ2V0T3JJbml0aWFsaXplU2VydmljZSh7XG4gICAgICAgICAgICBpbnN0YW5jZUlkZW50aWZpZXI6IG5vcm1hbGl6ZWRJZGVudGlmaWVyLFxuICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gcmVzb2x2ZSBhbnkgcGVuZGluZyBwcm9taXNlIHdhaXRpbmcgZm9yIHRoZSBzZXJ2aWNlIGluc3RhbmNlXG4gICAgICAgIGZvciAoY29uc3QgW2luc3RhbmNlSWRlbnRpZmllciwgaW5zdGFuY2VEZWZlcnJlZF0gb2YgdGhpcy5pbnN0YW5jZXNEZWZlcnJlZC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWREZWZlcnJlZElkZW50aWZpZXIgPSB0aGlzLm5vcm1hbGl6ZUluc3RhbmNlSWRlbnRpZmllcihpbnN0YW5jZUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgaWYgKG5vcm1hbGl6ZWRJZGVudGlmaWVyID09PSBub3JtYWxpemVkRGVmZXJyZWRJZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2VEZWZlcnJlZC5yZXNvbHZlKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrIC0gYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgaW52b2tlZCAgYWZ0ZXIgdGhlIHByb3ZpZGVyIGhhcyBiZWVuIGluaXRpYWxpemVkIGJ5IGNhbGxpbmcgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpLlxuICAgICAqIFRoZSBmdW5jdGlvbiBpcyBpbnZva2VkIFNZTkNIUk9OT1VTTFksIHNvIGl0IHNob3VsZCBub3QgZXhlY3V0ZSBhbnkgbG9uZ3J1bm5pbmcgdGFza3MgaW4gb3JkZXIgdG8gbm90IGJsb2NrIHRoZSBwcm9ncmFtLlxuICAgICAqXG4gICAgICogQHBhcmFtIGlkZW50aWZpZXIgQW4gb3B0aW9uYWwgaW5zdGFuY2UgaWRlbnRpZmllclxuICAgICAqIEByZXR1cm5zIGEgZnVuY3Rpb24gdG8gdW5yZWdpc3RlciB0aGUgY2FsbGJhY2tcbiAgICAgKi9cbiAgICBvbkluaXQoY2FsbGJhY2ssIGlkZW50aWZpZXIpIHtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZElkZW50aWZpZXIgPSB0aGlzLm5vcm1hbGl6ZUluc3RhbmNlSWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICAgICAgY29uc3QgZXhpc3RpbmdDYWxsYmFja3MgPSB0aGlzLm9uSW5pdENhbGxiYWNrcy5nZXQobm9ybWFsaXplZElkZW50aWZpZXIpID8/XG4gICAgICAgICAgICBuZXcgU2V0KCk7XG4gICAgICAgIGV4aXN0aW5nQ2FsbGJhY2tzLmFkZChjYWxsYmFjayk7XG4gICAgICAgIHRoaXMub25Jbml0Q2FsbGJhY2tzLnNldChub3JtYWxpemVkSWRlbnRpZmllciwgZXhpc3RpbmdDYWxsYmFja3MpO1xuICAgICAgICBjb25zdCBleGlzdGluZ0luc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KG5vcm1hbGl6ZWRJZGVudGlmaWVyKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nSW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGV4aXN0aW5nSW5zdGFuY2UsIG5vcm1hbGl6ZWRJZGVudGlmaWVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgZXhpc3RpbmdDYWxsYmFja3MuZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSW52b2tlIG9uSW5pdCBjYWxsYmFja3Mgc3luY2hyb25vdXNseVxuICAgICAqIEBwYXJhbSBpbnN0YW5jZSB0aGUgc2VydmljZSBpbnN0YW5jZWBcbiAgICAgKi9cbiAgICBpbnZva2VPbkluaXRDYWxsYmFja3MoaW5zdGFuY2UsIGlkZW50aWZpZXIpIHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gdGhpcy5vbkluaXRDYWxsYmFja3MuZ2V0KGlkZW50aWZpZXIpO1xuICAgICAgICBpZiAoIWNhbGxiYWNrcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGluc3RhbmNlLCBpZGVudGlmaWVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBpZ25vcmUgZXJyb3JzIGluIHRoZSBvbkluaXQgY2FsbGJhY2tcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBnZXRPckluaXRpYWxpemVTZXJ2aWNlKHsgaW5zdGFuY2VJZGVudGlmaWVyLCBvcHRpb25zID0ge30gfSkge1xuICAgICAgICBsZXQgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VJZGVudGlmaWVyKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSAmJiB0aGlzLmNvbXBvbmVudCkge1xuICAgICAgICAgICAgaW5zdGFuY2UgPSB0aGlzLmNvbXBvbmVudC5pbnN0YW5jZUZhY3RvcnkodGhpcy5jb250YWluZXIsIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZUlkZW50aWZpZXI6IG5vcm1hbGl6ZUlkZW50aWZpZXJGb3JGYWN0b3J5KGluc3RhbmNlSWRlbnRpZmllciksXG4gICAgICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlcy5zZXQoaW5zdGFuY2VJZGVudGlmaWVyLCBpbnN0YW5jZSk7XG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlc09wdGlvbnMuc2V0KGluc3RhbmNlSWRlbnRpZmllciwgb3B0aW9ucyk7XG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEludm9rZSBvbkluaXQgbGlzdGVuZXJzLlxuICAgICAgICAgICAgICogTm90ZSB0aGlzLmNvbXBvbmVudC5vbkluc3RhbmNlQ3JlYXRlZCBpcyBkaWZmZXJlbnQsIHdoaWNoIGlzIHVzZWQgYnkgdGhlIGNvbXBvbmVudCBjcmVhdG9yLFxuICAgICAgICAgICAgICogd2hpbGUgb25Jbml0IGxpc3RlbmVycyBhcmUgcmVnaXN0ZXJlZCBieSBjb25zdW1lcnMgb2YgdGhlIHByb3ZpZGVyLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmludm9rZU9uSW5pdENhbGxiYWNrcyhpbnN0YW5jZSwgaW5zdGFuY2VJZGVudGlmaWVyKTtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogT3JkZXIgaXMgaW1wb3J0YW50XG4gICAgICAgICAgICAgKiBvbkluc3RhbmNlQ3JlYXRlZCgpIHNob3VsZCBiZSBjYWxsZWQgYWZ0ZXIgdGhpcy5pbnN0YW5jZXMuc2V0KGluc3RhbmNlSWRlbnRpZmllciwgaW5zdGFuY2UpOyB3aGljaFxuICAgICAgICAgICAgICogbWFrZXMgYGlzSW5pdGlhbGl6ZWQoKWAgcmV0dXJuIHRydWUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbXBvbmVudC5vbkluc3RhbmNlQ3JlYXRlZCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcG9uZW50Lm9uSW5zdGFuY2VDcmVhdGVkKHRoaXMuY29udGFpbmVyLCBpbnN0YW5jZUlkZW50aWZpZXIsIGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZ25vcmUgZXJyb3JzIGluIHRoZSBvbkluc3RhbmNlQ3JlYXRlZENhbGxiYWNrXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0YW5jZSB8fCBudWxsO1xuICAgIH1cbiAgICBub3JtYWxpemVJbnN0YW5jZUlkZW50aWZpZXIoaWRlbnRpZmllciA9IERFRkFVTFRfRU5UUllfTkFNRSkge1xuICAgICAgICBpZiAodGhpcy5jb21wb25lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBvbmVudC5tdWx0aXBsZUluc3RhbmNlcyA/IGlkZW50aWZpZXIgOiBERUZBVUxUX0VOVFJZX05BTUU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gaWRlbnRpZmllcjsgLy8gYXNzdW1lIG11bHRpcGxlIGluc3RhbmNlcyBhcmUgc3VwcG9ydGVkIGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHByb3ZpZGVkLlxuICAgICAgICB9XG4gICAgfVxuICAgIHNob3VsZEF1dG9Jbml0aWFsaXplKCkge1xuICAgICAgICByZXR1cm4gKCEhdGhpcy5jb21wb25lbnQgJiZcbiAgICAgICAgICAgIHRoaXMuY29tcG9uZW50Lmluc3RhbnRpYXRpb25Nb2RlICE9PSBcIkVYUExJQ0lUXCIgLyogSW5zdGFudGlhdGlvbk1vZGUuRVhQTElDSVQgKi8pO1xuICAgIH1cbn1cbi8vIHVuZGVmaW5lZCBzaG91bGQgYmUgcGFzc2VkIHRvIHRoZSBzZXJ2aWNlIGZhY3RvcnkgZm9yIHRoZSBkZWZhdWx0IGluc3RhbmNlXG5mdW5jdGlvbiBub3JtYWxpemVJZGVudGlmaWVyRm9yRmFjdG9yeShpZGVudGlmaWVyKSB7XG4gICAgcmV0dXJuIGlkZW50aWZpZXIgPT09IERFRkFVTFRfRU5UUllfTkFNRSA/IHVuZGVmaW5lZCA6IGlkZW50aWZpZXI7XG59XG5mdW5jdGlvbiBpc0NvbXBvbmVudEVhZ2VyKGNvbXBvbmVudCkge1xuICAgIHJldHVybiBjb21wb25lbnQuaW5zdGFudGlhdGlvbk1vZGUgPT09IFwiRUFHRVJcIiAvKiBJbnN0YW50aWF0aW9uTW9kZS5FQUdFUiAqLztcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQ29tcG9uZW50Q29udGFpbmVyIHRoYXQgcHJvdmlkZXMgUHJvdmlkZXJzIGZvciBzZXJ2aWNlIG5hbWUgVCwgZS5nLiBgYXV0aGAsIGBhdXRoLWludGVybmFsYFxuICovXG5jbGFzcyBDb21wb25lbnRDb250YWluZXIge1xuICAgIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5wcm92aWRlcnMgPSBuZXcgTWFwKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbXBvbmVudCBDb21wb25lbnQgYmVpbmcgYWRkZWRcbiAgICAgKiBAcGFyYW0gb3ZlcndyaXRlIFdoZW4gYSBjb21wb25lbnQgd2l0aCB0aGUgc2FtZSBuYW1lIGhhcyBhbHJlYWR5IGJlZW4gcmVnaXN0ZXJlZCxcbiAgICAgKiBpZiBvdmVyd3JpdGUgaXMgdHJ1ZTogb3ZlcndyaXRlIHRoZSBleGlzdGluZyBjb21wb25lbnQgd2l0aCB0aGUgbmV3IGNvbXBvbmVudCBhbmQgY3JlYXRlIGEgbmV3XG4gICAgICogcHJvdmlkZXIgd2l0aCB0aGUgbmV3IGNvbXBvbmVudC4gSXQgY2FuIGJlIHVzZWZ1bCBpbiB0ZXN0cyB3aGVyZSB5b3Ugd2FudCB0byB1c2UgZGlmZmVyZW50IG1vY2tzXG4gICAgICogZm9yIGRpZmZlcmVudCB0ZXN0cy5cbiAgICAgKiBpZiBvdmVyd3JpdGUgaXMgZmFsc2U6IHRocm93IGFuIGV4Y2VwdGlvblxuICAgICAqL1xuICAgIGFkZENvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXIgPSB0aGlzLmdldFByb3ZpZGVyKGNvbXBvbmVudC5uYW1lKTtcbiAgICAgICAgaWYgKHByb3ZpZGVyLmlzQ29tcG9uZW50U2V0KCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcG9uZW50ICR7Y29tcG9uZW50Lm5hbWV9IGhhcyBhbHJlYWR5IGJlZW4gcmVnaXN0ZXJlZCB3aXRoICR7dGhpcy5uYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIHByb3ZpZGVyLnNldENvbXBvbmVudChjb21wb25lbnQpO1xuICAgIH1cbiAgICBhZGRPck92ZXJ3cml0ZUNvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXIgPSB0aGlzLmdldFByb3ZpZGVyKGNvbXBvbmVudC5uYW1lKTtcbiAgICAgICAgaWYgKHByb3ZpZGVyLmlzQ29tcG9uZW50U2V0KCkpIHtcbiAgICAgICAgICAgIC8vIGRlbGV0ZSB0aGUgZXhpc3RpbmcgcHJvdmlkZXIgZnJvbSB0aGUgY29udGFpbmVyLCBzbyB3ZSBjYW4gcmVnaXN0ZXIgdGhlIG5ldyBjb21wb25lbnRcbiAgICAgICAgICAgIHRoaXMucHJvdmlkZXJzLmRlbGV0ZShjb21wb25lbnQubmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogZ2V0UHJvdmlkZXIgcHJvdmlkZXMgYSB0eXBlIHNhZmUgaW50ZXJmYWNlIHdoZXJlIGl0IGNhbiBvbmx5IGJlIGNhbGxlZCB3aXRoIGEgZmllbGQgbmFtZVxuICAgICAqIHByZXNlbnQgaW4gTmFtZVNlcnZpY2VNYXBwaW5nIGludGVyZmFjZS5cbiAgICAgKlxuICAgICAqIEZpcmViYXNlIFNES3MgcHJvdmlkaW5nIHNlcnZpY2VzIHNob3VsZCBleHRlbmQgTmFtZVNlcnZpY2VNYXBwaW5nIGludGVyZmFjZSB0byByZWdpc3RlclxuICAgICAqIHRoZW1zZWx2ZXMuXG4gICAgICovXG4gICAgZ2V0UHJvdmlkZXIobmFtZSkge1xuICAgICAgICBpZiAodGhpcy5wcm92aWRlcnMuaGFzKG5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcm92aWRlcnMuZ2V0KG5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNyZWF0ZSBhIFByb3ZpZGVyIGZvciBhIHNlcnZpY2UgdGhhdCBoYXNuJ3QgcmVnaXN0ZXJlZCB3aXRoIEZpcmViYXNlXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IFByb3ZpZGVyKG5hbWUsIHRoaXMpO1xuICAgICAgICB0aGlzLnByb3ZpZGVycy5zZXQobmFtZSwgcHJvdmlkZXIpO1xuICAgICAgICByZXR1cm4gcHJvdmlkZXI7XG4gICAgfVxuICAgIGdldFByb3ZpZGVycygpIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5wcm92aWRlcnMudmFsdWVzKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgQ29tcG9uZW50LCBDb21wb25lbnRDb250YWluZXIsIFByb3ZpZGVyIH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5lc20uanMubWFwXG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBBIGNvbnRhaW5lciBmb3IgYWxsIG9mIHRoZSBMb2dnZXIgaW5zdGFuY2VzXG4gKi9cbmNvbnN0IGluc3RhbmNlcyA9IFtdO1xuLyoqXG4gKiBUaGUgSlMgU0RLIHN1cHBvcnRzIDUgbG9nIGxldmVscyBhbmQgYWxzbyBhbGxvd3MgYSB1c2VyIHRoZSBhYmlsaXR5IHRvXG4gKiBzaWxlbmNlIHRoZSBsb2dzIGFsdG9nZXRoZXIuXG4gKlxuICogVGhlIG9yZGVyIGlzIGEgZm9sbG93czpcbiAqIERFQlVHIDwgVkVSQk9TRSA8IElORk8gPCBXQVJOIDwgRVJST1JcbiAqXG4gKiBBbGwgb2YgdGhlIGxvZyB0eXBlcyBhYm92ZSB0aGUgY3VycmVudCBsb2cgbGV2ZWwgd2lsbCBiZSBjYXB0dXJlZCAoaS5lLiBpZlxuICogeW91IHNldCB0aGUgbG9nIGxldmVsIHRvIGBJTkZPYCwgZXJyb3JzIHdpbGwgc3RpbGwgYmUgbG9nZ2VkLCBidXQgYERFQlVHYCBhbmRcbiAqIGBWRVJCT1NFYCBsb2dzIHdpbGwgbm90KVxuICovXG52YXIgTG9nTGV2ZWw7XG4oZnVuY3Rpb24gKExvZ0xldmVsKSB7XG4gICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJERUJVR1wiXSA9IDBdID0gXCJERUJVR1wiO1xuICAgIExvZ0xldmVsW0xvZ0xldmVsW1wiVkVSQk9TRVwiXSA9IDFdID0gXCJWRVJCT1NFXCI7XG4gICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJJTkZPXCJdID0gMl0gPSBcIklORk9cIjtcbiAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIldBUk5cIl0gPSAzXSA9IFwiV0FSTlwiO1xuICAgIExvZ0xldmVsW0xvZ0xldmVsW1wiRVJST1JcIl0gPSA0XSA9IFwiRVJST1JcIjtcbiAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIlNJTEVOVFwiXSA9IDVdID0gXCJTSUxFTlRcIjtcbn0pKExvZ0xldmVsIHx8IChMb2dMZXZlbCA9IHt9KSk7XG5jb25zdCBsZXZlbFN0cmluZ1RvRW51bSA9IHtcbiAgICAnZGVidWcnOiBMb2dMZXZlbC5ERUJVRyxcbiAgICAndmVyYm9zZSc6IExvZ0xldmVsLlZFUkJPU0UsXG4gICAgJ2luZm8nOiBMb2dMZXZlbC5JTkZPLFxuICAgICd3YXJuJzogTG9nTGV2ZWwuV0FSTixcbiAgICAnZXJyb3InOiBMb2dMZXZlbC5FUlJPUixcbiAgICAnc2lsZW50JzogTG9nTGV2ZWwuU0lMRU5UXG59O1xuLyoqXG4gKiBUaGUgZGVmYXVsdCBsb2cgbGV2ZWxcbiAqL1xuY29uc3QgZGVmYXVsdExvZ0xldmVsID0gTG9nTGV2ZWwuSU5GTztcbi8qKlxuICogQnkgZGVmYXVsdCwgYGNvbnNvbGUuZGVidWdgIGlzIG5vdCBkaXNwbGF5ZWQgaW4gdGhlIGRldmVsb3BlciBjb25zb2xlIChpblxuICogY2hyb21lKS4gVG8gYXZvaWQgZm9yY2luZyB1c2VycyB0byBoYXZlIHRvIG9wdC1pbiB0byB0aGVzZSBsb2dzIHR3aWNlXG4gKiAoaS5lLiBvbmNlIGZvciBmaXJlYmFzZSwgYW5kIG9uY2UgaW4gdGhlIGNvbnNvbGUpLCB3ZSBhcmUgc2VuZGluZyBgREVCVUdgXG4gKiBsb2dzIHRvIHRoZSBgY29uc29sZS5sb2dgIGZ1bmN0aW9uLlxuICovXG5jb25zdCBDb25zb2xlTWV0aG9kID0ge1xuICAgIFtMb2dMZXZlbC5ERUJVR106ICdsb2cnLFxuICAgIFtMb2dMZXZlbC5WRVJCT1NFXTogJ2xvZycsXG4gICAgW0xvZ0xldmVsLklORk9dOiAnaW5mbycsXG4gICAgW0xvZ0xldmVsLldBUk5dOiAnd2FybicsXG4gICAgW0xvZ0xldmVsLkVSUk9SXTogJ2Vycm9yJ1xufTtcbi8qKlxuICogVGhlIGRlZmF1bHQgbG9nIGhhbmRsZXIgd2lsbCBmb3J3YXJkIERFQlVHLCBWRVJCT1NFLCBJTkZPLCBXQVJOLCBhbmQgRVJST1JcbiAqIG1lc3NhZ2VzIG9uIHRvIHRoZWlyIGNvcnJlc3BvbmRpbmcgY29uc29sZSBjb3VudGVycGFydHMgKGlmIHRoZSBsb2cgbWV0aG9kXG4gKiBpcyBzdXBwb3J0ZWQgYnkgdGhlIGN1cnJlbnQgbG9nIGxldmVsKVxuICovXG5jb25zdCBkZWZhdWx0TG9nSGFuZGxlciA9IChpbnN0YW5jZSwgbG9nVHlwZSwgLi4uYXJncykgPT4ge1xuICAgIGlmIChsb2dUeXBlIDwgaW5zdGFuY2UubG9nTGV2ZWwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgY29uc3QgbWV0aG9kID0gQ29uc29sZU1ldGhvZFtsb2dUeXBlXTtcbiAgICBpZiAobWV0aG9kKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXShgWyR7bm93fV0gICR7aW5zdGFuY2UubmFtZX06YCwgLi4uYXJncyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHRlZCB0byBsb2cgYSBtZXNzYWdlIHdpdGggYW4gaW52YWxpZCBsb2dUeXBlICh2YWx1ZTogJHtsb2dUeXBlfSlgKTtcbiAgICB9XG59O1xuY2xhc3MgTG9nZ2VyIHtcbiAgICAvKipcbiAgICAgKiBHaXZlcyB5b3UgYW4gaW5zdGFuY2Ugb2YgYSBMb2dnZXIgdG8gY2FwdHVyZSBtZXNzYWdlcyBhY2NvcmRpbmcgdG9cbiAgICAgKiBGaXJlYmFzZSdzIGxvZ2dpbmcgc2NoZW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgdGhhdCB0aGUgbG9ncyB3aWxsIGJlIGFzc29jaWF0ZWQgd2l0aFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBsb2cgbGV2ZWwgb2YgdGhlIGdpdmVuIExvZ2dlciBpbnN0YW5jZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2xvZ0xldmVsID0gZGVmYXVsdExvZ0xldmVsO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIG1haW4gKGludGVybmFsKSBsb2cgaGFuZGxlciBmb3IgdGhlIExvZ2dlciBpbnN0YW5jZS5cbiAgICAgICAgICogQ2FuIGJlIHNldCB0byBhIG5ldyBmdW5jdGlvbiBpbiBpbnRlcm5hbCBwYWNrYWdlIGNvZGUgYnV0IG5vdCBieSB1c2VyLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fbG9nSGFuZGxlciA9IGRlZmF1bHRMb2dIYW5kbGVyO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIG9wdGlvbmFsLCBhZGRpdGlvbmFsLCB1c2VyLWRlZmluZWQgbG9nIGhhbmRsZXIgZm9yIHRoZSBMb2dnZXIgaW5zdGFuY2UuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl91c2VyTG9nSGFuZGxlciA9IG51bGw7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYXB0dXJlIHRoZSBjdXJyZW50IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICovXG4gICAgICAgIGluc3RhbmNlcy5wdXNoKHRoaXMpO1xuICAgIH1cbiAgICBnZXQgbG9nTGV2ZWwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb2dMZXZlbDtcbiAgICB9XG4gICAgc2V0IGxvZ0xldmVsKHZhbCkge1xuICAgICAgICBpZiAoISh2YWwgaW4gTG9nTGV2ZWwpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBJbnZhbGlkIHZhbHVlIFwiJHt2YWx9XCIgYXNzaWduZWQgdG8gXFxgbG9nTGV2ZWxcXGBgKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9sb2dMZXZlbCA9IHZhbDtcbiAgICB9XG4gICAgLy8gV29ya2Fyb3VuZCBmb3Igc2V0dGVyL2dldHRlciBoYXZpbmcgdG8gYmUgdGhlIHNhbWUgdHlwZS5cbiAgICBzZXRMb2dMZXZlbCh2YWwpIHtcbiAgICAgICAgdGhpcy5fbG9nTGV2ZWwgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IGxldmVsU3RyaW5nVG9FbnVtW3ZhbF0gOiB2YWw7XG4gICAgfVxuICAgIGdldCBsb2dIYW5kbGVyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9nSGFuZGxlcjtcbiAgICB9XG4gICAgc2V0IGxvZ0hhbmRsZXIodmFsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdWYWx1ZSBhc3NpZ25lZCB0byBgbG9nSGFuZGxlcmAgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbG9nSGFuZGxlciA9IHZhbDtcbiAgICB9XG4gICAgZ2V0IHVzZXJMb2dIYW5kbGVyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdXNlckxvZ0hhbmRsZXI7XG4gICAgfVxuICAgIHNldCB1c2VyTG9nSGFuZGxlcih2YWwpIHtcbiAgICAgICAgdGhpcy5fdXNlckxvZ0hhbmRsZXIgPSB2YWw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBmdW5jdGlvbnMgYmVsb3cgYXJlIGFsbCBiYXNlZCBvbiB0aGUgYGNvbnNvbGVgIGludGVyZmFjZVxuICAgICAqL1xuICAgIGRlYnVnKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fdXNlckxvZ0hhbmRsZXIgJiYgdGhpcy5fdXNlckxvZ0hhbmRsZXIodGhpcywgTG9nTGV2ZWwuREVCVUcsIC4uLmFyZ3MpO1xuICAgICAgICB0aGlzLl9sb2dIYW5kbGVyKHRoaXMsIExvZ0xldmVsLkRFQlVHLCAuLi5hcmdzKTtcbiAgICB9XG4gICAgbG9nKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fdXNlckxvZ0hhbmRsZXIgJiZcbiAgICAgICAgICAgIHRoaXMuX3VzZXJMb2dIYW5kbGVyKHRoaXMsIExvZ0xldmVsLlZFUkJPU0UsIC4uLmFyZ3MpO1xuICAgICAgICB0aGlzLl9sb2dIYW5kbGVyKHRoaXMsIExvZ0xldmVsLlZFUkJPU0UsIC4uLmFyZ3MpO1xuICAgIH1cbiAgICBpbmZvKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fdXNlckxvZ0hhbmRsZXIgJiYgdGhpcy5fdXNlckxvZ0hhbmRsZXIodGhpcywgTG9nTGV2ZWwuSU5GTywgLi4uYXJncyk7XG4gICAgICAgIHRoaXMuX2xvZ0hhbmRsZXIodGhpcywgTG9nTGV2ZWwuSU5GTywgLi4uYXJncyk7XG4gICAgfVxuICAgIHdhcm4oLi4uYXJncykge1xuICAgICAgICB0aGlzLl91c2VyTG9nSGFuZGxlciAmJiB0aGlzLl91c2VyTG9nSGFuZGxlcih0aGlzLCBMb2dMZXZlbC5XQVJOLCAuLi5hcmdzKTtcbiAgICAgICAgdGhpcy5fbG9nSGFuZGxlcih0aGlzLCBMb2dMZXZlbC5XQVJOLCAuLi5hcmdzKTtcbiAgICB9XG4gICAgZXJyb3IoLi4uYXJncykge1xuICAgICAgICB0aGlzLl91c2VyTG9nSGFuZGxlciAmJiB0aGlzLl91c2VyTG9nSGFuZGxlcih0aGlzLCBMb2dMZXZlbC5FUlJPUiwgLi4uYXJncyk7XG4gICAgICAgIHRoaXMuX2xvZ0hhbmRsZXIodGhpcywgTG9nTGV2ZWwuRVJST1IsIC4uLmFyZ3MpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHNldExvZ0xldmVsKGxldmVsKSB7XG4gICAgaW5zdGFuY2VzLmZvckVhY2goaW5zdCA9PiB7XG4gICAgICAgIGluc3Quc2V0TG9nTGV2ZWwobGV2ZWwpO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gc2V0VXNlckxvZ0hhbmRsZXIobG9nQ2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICBmb3IgKGNvbnN0IGluc3RhbmNlIG9mIGluc3RhbmNlcykge1xuICAgICAgICBsZXQgY3VzdG9tTG9nTGV2ZWwgPSBudWxsO1xuICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmxldmVsKSB7XG4gICAgICAgICAgICBjdXN0b21Mb2dMZXZlbCA9IGxldmVsU3RyaW5nVG9FbnVtW29wdGlvbnMubGV2ZWxdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsb2dDYWxsYmFjayA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaW5zdGFuY2UudXNlckxvZ0hhbmRsZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaW5zdGFuY2UudXNlckxvZ0hhbmRsZXIgPSAoaW5zdGFuY2UsIGxldmVsLCAuLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGFyZ3NcbiAgICAgICAgICAgICAgICAgICAgLm1hcChhcmcgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJnID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8IHR5cGVvZiBhcmcgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZy50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGFyZyBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGlnbm9yZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoYXJnID0+IGFyZylcbiAgICAgICAgICAgICAgICAgICAgLmpvaW4oJyAnKTtcbiAgICAgICAgICAgICAgICBpZiAobGV2ZWwgPj0gKGN1c3RvbUxvZ0xldmVsID8/IGluc3RhbmNlLmxvZ0xldmVsKSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbDogTG9nTGV2ZWxbbGV2ZWxdLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJncyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGluc3RhbmNlLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IHsgTG9nTGV2ZWwsIExvZ2dlciwgc2V0TG9nTGV2ZWwsIHNldFVzZXJMb2dIYW5kbGVyIH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5lc20uanMubWFwXG4iLCJjb25zdCBpbnN0YW5jZU9mQW55ID0gKG9iamVjdCwgY29uc3RydWN0b3JzKSA9PiBjb25zdHJ1Y3RvcnMuc29tZSgoYykgPT4gb2JqZWN0IGluc3RhbmNlb2YgYyk7XG5cbmxldCBpZGJQcm94eWFibGVUeXBlcztcbmxldCBjdXJzb3JBZHZhbmNlTWV0aG9kcztcbi8vIFRoaXMgaXMgYSBmdW5jdGlvbiB0byBwcmV2ZW50IGl0IHRocm93aW5nIHVwIGluIG5vZGUgZW52aXJvbm1lbnRzLlxuZnVuY3Rpb24gZ2V0SWRiUHJveHlhYmxlVHlwZXMoKSB7XG4gICAgcmV0dXJuIChpZGJQcm94eWFibGVUeXBlcyB8fFxuICAgICAgICAoaWRiUHJveHlhYmxlVHlwZXMgPSBbXG4gICAgICAgICAgICBJREJEYXRhYmFzZSxcbiAgICAgICAgICAgIElEQk9iamVjdFN0b3JlLFxuICAgICAgICAgICAgSURCSW5kZXgsXG4gICAgICAgICAgICBJREJDdXJzb3IsXG4gICAgICAgICAgICBJREJUcmFuc2FjdGlvbixcbiAgICAgICAgXSkpO1xufVxuLy8gVGhpcyBpcyBhIGZ1bmN0aW9uIHRvIHByZXZlbnQgaXQgdGhyb3dpbmcgdXAgaW4gbm9kZSBlbnZpcm9ubWVudHMuXG5mdW5jdGlvbiBnZXRDdXJzb3JBZHZhbmNlTWV0aG9kcygpIHtcbiAgICByZXR1cm4gKGN1cnNvckFkdmFuY2VNZXRob2RzIHx8XG4gICAgICAgIChjdXJzb3JBZHZhbmNlTWV0aG9kcyA9IFtcbiAgICAgICAgICAgIElEQkN1cnNvci5wcm90b3R5cGUuYWR2YW5jZSxcbiAgICAgICAgICAgIElEQkN1cnNvci5wcm90b3R5cGUuY29udGludWUsXG4gICAgICAgICAgICBJREJDdXJzb3IucHJvdG90eXBlLmNvbnRpbnVlUHJpbWFyeUtleSxcbiAgICAgICAgXSkpO1xufVxuY29uc3QgY3Vyc29yUmVxdWVzdE1hcCA9IG5ldyBXZWFrTWFwKCk7XG5jb25zdCB0cmFuc2FjdGlvbkRvbmVNYXAgPSBuZXcgV2Vha01hcCgpO1xuY29uc3QgdHJhbnNhY3Rpb25TdG9yZU5hbWVzTWFwID0gbmV3IFdlYWtNYXAoKTtcbmNvbnN0IHRyYW5zZm9ybUNhY2hlID0gbmV3IFdlYWtNYXAoKTtcbmNvbnN0IHJldmVyc2VUcmFuc2Zvcm1DYWNoZSA9IG5ldyBXZWFrTWFwKCk7XG5mdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpIHtcbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCB1bmxpc3RlbiA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlcXVlc3QucmVtb3ZlRXZlbnRMaXN0ZW5lcignc3VjY2VzcycsIHN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmVxdWVzdC5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc3VjY2VzcyA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUod3JhcChyZXF1ZXN0LnJlc3VsdCkpO1xuICAgICAgICAgICAgdW5saXN0ZW4oKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICAgICAgICB1bmxpc3RlbigpO1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ3N1Y2Nlc3MnLCBzdWNjZXNzKTtcbiAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9yKTtcbiAgICB9KTtcbiAgICBwcm9taXNlXG4gICAgICAgIC50aGVuKCh2YWx1ZSkgPT4ge1xuICAgICAgICAvLyBTaW5jZSBjdXJzb3JpbmcgcmV1c2VzIHRoZSBJREJSZXF1ZXN0ICgqc2lnaCopLCB3ZSBjYWNoZSBpdCBmb3IgbGF0ZXIgcmV0cmlldmFsXG4gICAgICAgIC8vIChzZWUgd3JhcEZ1bmN0aW9uKS5cbiAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgSURCQ3Vyc29yKSB7XG4gICAgICAgICAgICBjdXJzb3JSZXF1ZXN0TWFwLnNldCh2YWx1ZSwgcmVxdWVzdCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2F0Y2hpbmcgdG8gYXZvaWQgXCJVbmNhdWdodCBQcm9taXNlIGV4Y2VwdGlvbnNcIlxuICAgIH0pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7IH0pO1xuICAgIC8vIFRoaXMgbWFwcGluZyBleGlzdHMgaW4gcmV2ZXJzZVRyYW5zZm9ybUNhY2hlIGJ1dCBkb2Vzbid0IGRvZXNuJ3QgZXhpc3QgaW4gdHJhbnNmb3JtQ2FjaGUuIFRoaXNcbiAgICAvLyBpcyBiZWNhdXNlIHdlIGNyZWF0ZSBtYW55IHByb21pc2VzIGZyb20gYSBzaW5nbGUgSURCUmVxdWVzdC5cbiAgICByZXZlcnNlVHJhbnNmb3JtQ2FjaGUuc2V0KHByb21pc2UsIHJlcXVlc3QpO1xuICAgIHJldHVybiBwcm9taXNlO1xufVxuZnVuY3Rpb24gY2FjaGVEb25lUHJvbWlzZUZvclRyYW5zYWN0aW9uKHR4KSB7XG4gICAgLy8gRWFybHkgYmFpbCBpZiB3ZSd2ZSBhbHJlYWR5IGNyZWF0ZWQgYSBkb25lIHByb21pc2UgZm9yIHRoaXMgdHJhbnNhY3Rpb24uXG4gICAgaWYgKHRyYW5zYWN0aW9uRG9uZU1hcC5oYXModHgpKVxuICAgICAgICByZXR1cm47XG4gICAgY29uc3QgZG9uZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgdW5saXN0ZW4gPSAoKSA9PiB7XG4gICAgICAgICAgICB0eC5yZW1vdmVFdmVudExpc3RlbmVyKCdjb21wbGV0ZScsIGNvbXBsZXRlKTtcbiAgICAgICAgICAgIHR4LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgICAgICAgdHgucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBlcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGNvbXBsZXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgdW5saXN0ZW4oKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICByZWplY3QodHguZXJyb3IgfHwgbmV3IERPTUV4Y2VwdGlvbignQWJvcnRFcnJvcicsICdBYm9ydEVycm9yJykpO1xuICAgICAgICAgICAgdW5saXN0ZW4oKTtcbiAgICAgICAgfTtcbiAgICAgICAgdHguYWRkRXZlbnRMaXN0ZW5lcignY29tcGxldGUnLCBjb21wbGV0ZSk7XG4gICAgICAgIHR4LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgICB0eC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIGVycm9yKTtcbiAgICB9KTtcbiAgICAvLyBDYWNoZSBpdCBmb3IgbGF0ZXIgcmV0cmlldmFsLlxuICAgIHRyYW5zYWN0aW9uRG9uZU1hcC5zZXQodHgsIGRvbmUpO1xufVxubGV0IGlkYlByb3h5VHJhcHMgPSB7XG4gICAgZ2V0KHRhcmdldCwgcHJvcCwgcmVjZWl2ZXIpIHtcbiAgICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIElEQlRyYW5zYWN0aW9uKSB7XG4gICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciB0cmFuc2FjdGlvbi5kb25lLlxuICAgICAgICAgICAgaWYgKHByb3AgPT09ICdkb25lJylcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNhY3Rpb25Eb25lTWFwLmdldCh0YXJnZXQpO1xuICAgICAgICAgICAgLy8gUG9seWZpbGwgZm9yIG9iamVjdFN0b3JlTmFtZXMgYmVjYXVzZSBvZiBFZGdlLlxuICAgICAgICAgICAgaWYgKHByb3AgPT09ICdvYmplY3RTdG9yZU5hbWVzJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQub2JqZWN0U3RvcmVOYW1lcyB8fCB0cmFuc2FjdGlvblN0b3JlTmFtZXNNYXAuZ2V0KHRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYWtlIHR4LnN0b3JlIHJldHVybiB0aGUgb25seSBzdG9yZSBpbiB0aGUgdHJhbnNhY3Rpb24sIG9yIHVuZGVmaW5lZCBpZiB0aGVyZSBhcmUgbWFueS5cbiAgICAgICAgICAgIGlmIChwcm9wID09PSAnc3RvcmUnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY2VpdmVyLm9iamVjdFN0b3JlTmFtZXNbMV1cbiAgICAgICAgICAgICAgICAgICAgPyB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgOiByZWNlaXZlci5vYmplY3RTdG9yZShyZWNlaXZlci5vYmplY3RTdG9yZU5hbWVzWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBFbHNlIHRyYW5zZm9ybSB3aGF0ZXZlciB3ZSBnZXQgYmFjay5cbiAgICAgICAgcmV0dXJuIHdyYXAodGFyZ2V0W3Byb3BdKTtcbiAgICB9LFxuICAgIHNldCh0YXJnZXQsIHByb3AsIHZhbHVlKSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIGhhcyh0YXJnZXQsIHByb3ApIHtcbiAgICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIElEQlRyYW5zYWN0aW9uICYmXG4gICAgICAgICAgICAocHJvcCA9PT0gJ2RvbmUnIHx8IHByb3AgPT09ICdzdG9yZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvcCBpbiB0YXJnZXQ7XG4gICAgfSxcbn07XG5mdW5jdGlvbiByZXBsYWNlVHJhcHMoY2FsbGJhY2spIHtcbiAgICBpZGJQcm94eVRyYXBzID0gY2FsbGJhY2soaWRiUHJveHlUcmFwcyk7XG59XG5mdW5jdGlvbiB3cmFwRnVuY3Rpb24oZnVuYykge1xuICAgIC8vIER1ZSB0byBleHBlY3RlZCBvYmplY3QgZXF1YWxpdHkgKHdoaWNoIGlzIGVuZm9yY2VkIGJ5IHRoZSBjYWNoaW5nIGluIGB3cmFwYCksIHdlXG4gICAgLy8gb25seSBjcmVhdGUgb25lIG5ldyBmdW5jIHBlciBmdW5jLlxuICAgIC8vIEVkZ2UgZG9lc24ndCBzdXBwb3J0IG9iamVjdFN0b3JlTmFtZXMgKGJvb28pLCBzbyB3ZSBwb2x5ZmlsbCBpdCBoZXJlLlxuICAgIGlmIChmdW5jID09PSBJREJEYXRhYmFzZS5wcm90b3R5cGUudHJhbnNhY3Rpb24gJiZcbiAgICAgICAgISgnb2JqZWN0U3RvcmVOYW1lcycgaW4gSURCVHJhbnNhY3Rpb24ucHJvdG90eXBlKSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHN0b3JlTmFtZXMsIC4uLmFyZ3MpIHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZnVuYy5jYWxsKHVud3JhcCh0aGlzKSwgc3RvcmVOYW1lcywgLi4uYXJncyk7XG4gICAgICAgICAgICB0cmFuc2FjdGlvblN0b3JlTmFtZXNNYXAuc2V0KHR4LCBzdG9yZU5hbWVzLnNvcnQgPyBzdG9yZU5hbWVzLnNvcnQoKSA6IFtzdG9yZU5hbWVzXSk7XG4gICAgICAgICAgICByZXR1cm4gd3JhcCh0eCk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIC8vIEN1cnNvciBtZXRob2RzIGFyZSBzcGVjaWFsLCBhcyB0aGUgYmVoYXZpb3VyIGlzIGEgbGl0dGxlIG1vcmUgZGlmZmVyZW50IHRvIHN0YW5kYXJkIElEQi4gSW5cbiAgICAvLyBJREIsIHlvdSBhZHZhbmNlIHRoZSBjdXJzb3IgYW5kIHdhaXQgZm9yIGEgbmV3ICdzdWNjZXNzJyBvbiB0aGUgSURCUmVxdWVzdCB0aGF0IGdhdmUgeW91IHRoZVxuICAgIC8vIGN1cnNvci4gSXQncyBraW5kYSBsaWtlIGEgcHJvbWlzZSB0aGF0IGNhbiByZXNvbHZlIHdpdGggbWFueSB2YWx1ZXMuIFRoYXQgZG9lc24ndCBtYWtlIHNlbnNlXG4gICAgLy8gd2l0aCByZWFsIHByb21pc2VzLCBzbyBlYWNoIGFkdmFuY2UgbWV0aG9kcyByZXR1cm5zIGEgbmV3IHByb21pc2UgZm9yIHRoZSBjdXJzb3Igb2JqZWN0LCBvclxuICAgIC8vIHVuZGVmaW5lZCBpZiB0aGUgZW5kIG9mIHRoZSBjdXJzb3IgaGFzIGJlZW4gcmVhY2hlZC5cbiAgICBpZiAoZ2V0Q3Vyc29yQWR2YW5jZU1ldGhvZHMoKS5pbmNsdWRlcyhmdW5jKSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgIC8vIENhbGxpbmcgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uIHdpdGggdGhlIHByb3h5IGFzICd0aGlzJyBjYXVzZXMgSUxMRUdBTCBJTlZPQ0FUSU9OLCBzbyB3ZSB1c2VcbiAgICAgICAgICAgIC8vIHRoZSBvcmlnaW5hbCBvYmplY3QuXG4gICAgICAgICAgICBmdW5jLmFwcGx5KHVud3JhcCh0aGlzKSwgYXJncyk7XG4gICAgICAgICAgICByZXR1cm4gd3JhcChjdXJzb3JSZXF1ZXN0TWFwLmdldCh0aGlzKSk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICAvLyBDYWxsaW5nIHRoZSBvcmlnaW5hbCBmdW5jdGlvbiB3aXRoIHRoZSBwcm94eSBhcyAndGhpcycgY2F1c2VzIElMTEVHQUwgSU5WT0NBVElPTiwgc28gd2UgdXNlXG4gICAgICAgIC8vIHRoZSBvcmlnaW5hbCBvYmplY3QuXG4gICAgICAgIHJldHVybiB3cmFwKGZ1bmMuYXBwbHkodW53cmFwKHRoaXMpLCBhcmdzKSk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIHRyYW5zZm9ybUNhY2hhYmxlVmFsdWUodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gd3JhcEZ1bmN0aW9uKHZhbHVlKTtcbiAgICAvLyBUaGlzIGRvZXNuJ3QgcmV0dXJuLCBpdCBqdXN0IGNyZWF0ZXMgYSAnZG9uZScgcHJvbWlzZSBmb3IgdGhlIHRyYW5zYWN0aW9uLFxuICAgIC8vIHdoaWNoIGlzIGxhdGVyIHJldHVybmVkIGZvciB0cmFuc2FjdGlvbi5kb25lIChzZWUgaWRiT2JqZWN0SGFuZGxlcikuXG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgSURCVHJhbnNhY3Rpb24pXG4gICAgICAgIGNhY2hlRG9uZVByb21pc2VGb3JUcmFuc2FjdGlvbih2YWx1ZSk7XG4gICAgaWYgKGluc3RhbmNlT2ZBbnkodmFsdWUsIGdldElkYlByb3h5YWJsZVR5cGVzKCkpKVxuICAgICAgICByZXR1cm4gbmV3IFByb3h5KHZhbHVlLCBpZGJQcm94eVRyYXBzKTtcbiAgICAvLyBSZXR1cm4gdGhlIHNhbWUgdmFsdWUgYmFjayBpZiB3ZSdyZSBub3QgZ29pbmcgdG8gdHJhbnNmb3JtIGl0LlxuICAgIHJldHVybiB2YWx1ZTtcbn1cbmZ1bmN0aW9uIHdyYXAodmFsdWUpIHtcbiAgICAvLyBXZSBzb21ldGltZXMgZ2VuZXJhdGUgbXVsdGlwbGUgcHJvbWlzZXMgZnJvbSBhIHNpbmdsZSBJREJSZXF1ZXN0IChlZyB3aGVuIGN1cnNvcmluZyksIGJlY2F1c2VcbiAgICAvLyBJREIgaXMgd2VpcmQgYW5kIGEgc2luZ2xlIElEQlJlcXVlc3QgY2FuIHlpZWxkIG1hbnkgcmVzcG9uc2VzLCBzbyB0aGVzZSBjYW4ndCBiZSBjYWNoZWQuXG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgSURCUmVxdWVzdClcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3QodmFsdWUpO1xuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgdHJhbnNmb3JtZWQgdGhpcyB2YWx1ZSBiZWZvcmUsIHJldXNlIHRoZSB0cmFuc2Zvcm1lZCB2YWx1ZS5cbiAgICAvLyBUaGlzIGlzIGZhc3RlciwgYnV0IGl0IGFsc28gcHJvdmlkZXMgb2JqZWN0IGVxdWFsaXR5LlxuICAgIGlmICh0cmFuc2Zvcm1DYWNoZS5oYXModmFsdWUpKVxuICAgICAgICByZXR1cm4gdHJhbnNmb3JtQ2FjaGUuZ2V0KHZhbHVlKTtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IHRyYW5zZm9ybUNhY2hhYmxlVmFsdWUodmFsdWUpO1xuICAgIC8vIE5vdCBhbGwgdHlwZXMgYXJlIHRyYW5zZm9ybWVkLlxuICAgIC8vIFRoZXNlIG1heSBiZSBwcmltaXRpdmUgdHlwZXMsIHNvIHRoZXkgY2FuJ3QgYmUgV2Vha01hcCBrZXlzLlxuICAgIGlmIChuZXdWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgdHJhbnNmb3JtQ2FjaGUuc2V0KHZhbHVlLCBuZXdWYWx1ZSk7XG4gICAgICAgIHJldmVyc2VUcmFuc2Zvcm1DYWNoZS5zZXQobmV3VmFsdWUsIHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld1ZhbHVlO1xufVxuY29uc3QgdW53cmFwID0gKHZhbHVlKSA9PiByZXZlcnNlVHJhbnNmb3JtQ2FjaGUuZ2V0KHZhbHVlKTtcblxuZXhwb3J0IHsgcmV2ZXJzZVRyYW5zZm9ybUNhY2hlIGFzIGEsIGluc3RhbmNlT2ZBbnkgYXMgaSwgcmVwbGFjZVRyYXBzIGFzIHIsIHVud3JhcCBhcyB1LCB3cmFwIGFzIHcgfTtcbiIsImltcG9ydCB7IHcgYXMgd3JhcCwgciBhcyByZXBsYWNlVHJhcHMgfSBmcm9tICcuL3dyYXAtaWRiLXZhbHVlLmpzJztcbmV4cG9ydCB7IHUgYXMgdW53cmFwLCB3IGFzIHdyYXAgfSBmcm9tICcuL3dyYXAtaWRiLXZhbHVlLmpzJztcblxuLyoqXG4gKiBPcGVuIGEgZGF0YWJhc2UuXG4gKlxuICogQHBhcmFtIG5hbWUgTmFtZSBvZiB0aGUgZGF0YWJhc2UuXG4gKiBAcGFyYW0gdmVyc2lvbiBTY2hlbWEgdmVyc2lvbi5cbiAqIEBwYXJhbSBjYWxsYmFja3MgQWRkaXRpb25hbCBjYWxsYmFja3MuXG4gKi9cbmZ1bmN0aW9uIG9wZW5EQihuYW1lLCB2ZXJzaW9uLCB7IGJsb2NrZWQsIHVwZ3JhZGUsIGJsb2NraW5nLCB0ZXJtaW5hdGVkIH0gPSB7fSkge1xuICAgIGNvbnN0IHJlcXVlc3QgPSBpbmRleGVkREIub3BlbihuYW1lLCB2ZXJzaW9uKTtcbiAgICBjb25zdCBvcGVuUHJvbWlzZSA9IHdyYXAocmVxdWVzdCk7XG4gICAgaWYgKHVwZ3JhZGUpIHtcbiAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCd1cGdyYWRlbmVlZGVkJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB1cGdyYWRlKHdyYXAocmVxdWVzdC5yZXN1bHQpLCBldmVudC5vbGRWZXJzaW9uLCBldmVudC5uZXdWZXJzaW9uLCB3cmFwKHJlcXVlc3QudHJhbnNhY3Rpb24pLCBldmVudCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoYmxvY2tlZCkge1xuICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2Jsb2NrZWQnLCAoZXZlbnQpID0+IGJsb2NrZWQoXG4gICAgICAgIC8vIENhc3RpbmcgZHVlIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC1ET00tbGliLWdlbmVyYXRvci9wdWxsLzE0MDVcbiAgICAgICAgZXZlbnQub2xkVmVyc2lvbiwgZXZlbnQubmV3VmVyc2lvbiwgZXZlbnQpKTtcbiAgICB9XG4gICAgb3BlblByb21pc2VcbiAgICAgICAgLnRoZW4oKGRiKSA9PiB7XG4gICAgICAgIGlmICh0ZXJtaW5hdGVkKVxuICAgICAgICAgICAgZGIuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCAoKSA9PiB0ZXJtaW5hdGVkKCkpO1xuICAgICAgICBpZiAoYmxvY2tpbmcpIHtcbiAgICAgICAgICAgIGRiLmFkZEV2ZW50TGlzdGVuZXIoJ3ZlcnNpb25jaGFuZ2UnLCAoZXZlbnQpID0+IGJsb2NraW5nKGV2ZW50Lm9sZFZlcnNpb24sIGV2ZW50Lm5ld1ZlcnNpb24sIGV2ZW50KSk7XG4gICAgICAgIH1cbiAgICB9KVxuICAgICAgICAuY2F0Y2goKCkgPT4geyB9KTtcbiAgICByZXR1cm4gb3BlblByb21pc2U7XG59XG4vKipcbiAqIERlbGV0ZSBhIGRhdGFiYXNlLlxuICpcbiAqIEBwYXJhbSBuYW1lIE5hbWUgb2YgdGhlIGRhdGFiYXNlLlxuICovXG5mdW5jdGlvbiBkZWxldGVEQihuYW1lLCB7IGJsb2NrZWQgfSA9IHt9KSB7XG4gICAgY29uc3QgcmVxdWVzdCA9IGluZGV4ZWREQi5kZWxldGVEYXRhYmFzZShuYW1lKTtcbiAgICBpZiAoYmxvY2tlZCkge1xuICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2Jsb2NrZWQnLCAoZXZlbnQpID0+IGJsb2NrZWQoXG4gICAgICAgIC8vIENhc3RpbmcgZHVlIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC1ET00tbGliLWdlbmVyYXRvci9wdWxsLzE0MDVcbiAgICAgICAgZXZlbnQub2xkVmVyc2lvbiwgZXZlbnQpKTtcbiAgICB9XG4gICAgcmV0dXJuIHdyYXAocmVxdWVzdCkudGhlbigoKSA9PiB1bmRlZmluZWQpO1xufVxuXG5jb25zdCByZWFkTWV0aG9kcyA9IFsnZ2V0JywgJ2dldEtleScsICdnZXRBbGwnLCAnZ2V0QWxsS2V5cycsICdjb3VudCddO1xuY29uc3Qgd3JpdGVNZXRob2RzID0gWydwdXQnLCAnYWRkJywgJ2RlbGV0ZScsICdjbGVhciddO1xuY29uc3QgY2FjaGVkTWV0aG9kcyA9IG5ldyBNYXAoKTtcbmZ1bmN0aW9uIGdldE1ldGhvZCh0YXJnZXQsIHByb3ApIHtcbiAgICBpZiAoISh0YXJnZXQgaW5zdGFuY2VvZiBJREJEYXRhYmFzZSAmJlxuICAgICAgICAhKHByb3AgaW4gdGFyZ2V0KSAmJlxuICAgICAgICB0eXBlb2YgcHJvcCA9PT0gJ3N0cmluZycpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNhY2hlZE1ldGhvZHMuZ2V0KHByb3ApKVxuICAgICAgICByZXR1cm4gY2FjaGVkTWV0aG9kcy5nZXQocHJvcCk7XG4gICAgY29uc3QgdGFyZ2V0RnVuY05hbWUgPSBwcm9wLnJlcGxhY2UoL0Zyb21JbmRleCQvLCAnJyk7XG4gICAgY29uc3QgdXNlSW5kZXggPSBwcm9wICE9PSB0YXJnZXRGdW5jTmFtZTtcbiAgICBjb25zdCBpc1dyaXRlID0gd3JpdGVNZXRob2RzLmluY2x1ZGVzKHRhcmdldEZ1bmNOYW1lKTtcbiAgICBpZiAoXG4gICAgLy8gQmFpbCBpZiB0aGUgdGFyZ2V0IGRvZXNuJ3QgZXhpc3Qgb24gdGhlIHRhcmdldC4gRWcsIGdldEFsbCBpc24ndCBpbiBFZGdlLlxuICAgICEodGFyZ2V0RnVuY05hbWUgaW4gKHVzZUluZGV4ID8gSURCSW5kZXggOiBJREJPYmplY3RTdG9yZSkucHJvdG90eXBlKSB8fFxuICAgICAgICAhKGlzV3JpdGUgfHwgcmVhZE1ldGhvZHMuaW5jbHVkZXModGFyZ2V0RnVuY05hbWUpKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG1ldGhvZCA9IGFzeW5jIGZ1bmN0aW9uIChzdG9yZU5hbWUsIC4uLmFyZ3MpIHtcbiAgICAgICAgLy8gaXNXcml0ZSA/ICdyZWFkd3JpdGUnIDogdW5kZWZpbmVkIGd6aXBwcyBiZXR0ZXIsIGJ1dCBmYWlscyBpbiBFZGdlIDooXG4gICAgICAgIGNvbnN0IHR4ID0gdGhpcy50cmFuc2FjdGlvbihzdG9yZU5hbWUsIGlzV3JpdGUgPyAncmVhZHdyaXRlJyA6ICdyZWFkb25seScpO1xuICAgICAgICBsZXQgdGFyZ2V0ID0gdHguc3RvcmU7XG4gICAgICAgIGlmICh1c2VJbmRleClcbiAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5pbmRleChhcmdzLnNoaWZ0KCkpO1xuICAgICAgICAvLyBNdXN0IHJlamVjdCBpZiBvcCByZWplY3RzLlxuICAgICAgICAvLyBJZiBpdCdzIGEgd3JpdGUgb3BlcmF0aW9uLCBtdXN0IHJlamVjdCBpZiB0eC5kb25lIHJlamVjdHMuXG4gICAgICAgIC8vIE11c3QgcmVqZWN0IHdpdGggb3AgcmVqZWN0aW9uIGZpcnN0LlxuICAgICAgICAvLyBNdXN0IHJlc29sdmUgd2l0aCBvcCB2YWx1ZS5cbiAgICAgICAgLy8gTXVzdCBoYW5kbGUgYm90aCBwcm9taXNlcyAobm8gdW5oYW5kbGVkIHJlamVjdGlvbnMpXG4gICAgICAgIHJldHVybiAoYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgdGFyZ2V0W3RhcmdldEZ1bmNOYW1lXSguLi5hcmdzKSxcbiAgICAgICAgICAgIGlzV3JpdGUgJiYgdHguZG9uZSxcbiAgICAgICAgXSkpWzBdO1xuICAgIH07XG4gICAgY2FjaGVkTWV0aG9kcy5zZXQocHJvcCwgbWV0aG9kKTtcbiAgICByZXR1cm4gbWV0aG9kO1xufVxucmVwbGFjZVRyYXBzKChvbGRUcmFwcykgPT4gKHtcbiAgICAuLi5vbGRUcmFwcyxcbiAgICBnZXQ6ICh0YXJnZXQsIHByb3AsIHJlY2VpdmVyKSA9PiBnZXRNZXRob2QodGFyZ2V0LCBwcm9wKSB8fCBvbGRUcmFwcy5nZXQodGFyZ2V0LCBwcm9wLCByZWNlaXZlciksXG4gICAgaGFzOiAodGFyZ2V0LCBwcm9wKSA9PiAhIWdldE1ldGhvZCh0YXJnZXQsIHByb3ApIHx8IG9sZFRyYXBzLmhhcyh0YXJnZXQsIHByb3ApLFxufSkpO1xuXG5leHBvcnQgeyBkZWxldGVEQiwgb3BlbkRCIH07XG4iLCJpbXBvcnQgeyBDb21wb25lbnQsIENvbXBvbmVudENvbnRhaW5lciB9IGZyb20gJ0BmaXJlYmFzZS9jb21wb25lbnQnO1xuaW1wb3J0IHsgTG9nZ2VyLCBzZXRVc2VyTG9nSGFuZGxlciwgc2V0TG9nTGV2ZWwgYXMgc2V0TG9nTGV2ZWwkMSB9IGZyb20gJ0BmaXJlYmFzZS9sb2dnZXInO1xuaW1wb3J0IHsgRXJyb3JGYWN0b3J5LCBiYXNlNjREZWNvZGUsIGdldERlZmF1bHRBcHBDb25maWcsIGRlZXBFcXVhbCwgaXNCcm93c2VyLCBpc1dlYldvcmtlciwgRmlyZWJhc2VFcnJvciwgYmFzZTY0dXJsRW5jb2RlV2l0aG91dFBhZGRpbmcsIGlzSW5kZXhlZERCQXZhaWxhYmxlLCB2YWxpZGF0ZUluZGV4ZWREQk9wZW5hYmxlIH0gZnJvbSAnQGZpcmViYXNlL3V0aWwnO1xuZXhwb3J0IHsgRmlyZWJhc2VFcnJvciB9IGZyb20gJ0BmaXJlYmFzZS91dGlsJztcbmltcG9ydCB7IG9wZW5EQiB9IGZyb20gJ2lkYic7XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5jbGFzcyBQbGF0Zm9ybUxvZ2dlclNlcnZpY2VJbXBsIHtcbiAgICBjb25zdHJ1Y3Rvcihjb250YWluZXIpIHtcbiAgICAgICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XG4gICAgfVxuICAgIC8vIEluIGluaXRpYWwgaW1wbGVtZW50YXRpb24sIHRoaXMgd2lsbCBiZSBjYWxsZWQgYnkgaW5zdGFsbGF0aW9ucyBvblxuICAgIC8vIGF1dGggdG9rZW4gcmVmcmVzaCwgYW5kIGluc3RhbGxhdGlvbnMgd2lsbCBzZW5kIHRoaXMgc3RyaW5nLlxuICAgIGdldFBsYXRmb3JtSW5mb1N0cmluZygpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJzID0gdGhpcy5jb250YWluZXIuZ2V0UHJvdmlkZXJzKCk7XG4gICAgICAgIC8vIExvb3AgdGhyb3VnaCBwcm92aWRlcnMgYW5kIGdldCBsaWJyYXJ5L3ZlcnNpb24gcGFpcnMgZnJvbSBhbnkgdGhhdCBhcmVcbiAgICAgICAgLy8gdmVyc2lvbiBjb21wb25lbnRzLlxuICAgICAgICByZXR1cm4gcHJvdmlkZXJzXG4gICAgICAgICAgICAubWFwKHByb3ZpZGVyID0+IHtcbiAgICAgICAgICAgIGlmIChpc1ZlcnNpb25TZXJ2aWNlUHJvdmlkZXIocHJvdmlkZXIpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VydmljZSA9IHByb3ZpZGVyLmdldEltbWVkaWF0ZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBgJHtzZXJ2aWNlLmxpYnJhcnl9LyR7c2VydmljZS52ZXJzaW9ufWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIobG9nU3RyaW5nID0+IGxvZ1N0cmluZylcbiAgICAgICAgICAgIC5qb2luKCcgJyk7XG4gICAgfVxufVxuLyoqXG4gKlxuICogQHBhcmFtIHByb3ZpZGVyIGNoZWNrIGlmIHRoaXMgcHJvdmlkZXIgcHJvdmlkZXMgYSBWZXJzaW9uU2VydmljZVxuICpcbiAqIE5PVEU6IFVzaW5nIFByb3ZpZGVyPCdhcHAtdmVyc2lvbic+IGlzIGEgaGFjayB0byBpbmRpY2F0ZSB0aGF0IHRoZSBwcm92aWRlclxuICogcHJvdmlkZXMgVmVyc2lvblNlcnZpY2UuIFRoZSBwcm92aWRlciBpcyBub3QgbmVjZXNzYXJpbHkgYSAnYXBwLXZlcnNpb24nXG4gKiBwcm92aWRlci5cbiAqL1xuZnVuY3Rpb24gaXNWZXJzaW9uU2VydmljZVByb3ZpZGVyKHByb3ZpZGVyKSB7XG4gICAgY29uc3QgY29tcG9uZW50ID0gcHJvdmlkZXIuZ2V0Q29tcG9uZW50KCk7XG4gICAgcmV0dXJuIGNvbXBvbmVudD8udHlwZSA9PT0gXCJWRVJTSU9OXCIgLyogQ29tcG9uZW50VHlwZS5WRVJTSU9OICovO1xufVxuXG5jb25zdCBuYW1lJHEgPSBcIkBmaXJlYmFzZS9hcHBcIjtcbmNvbnN0IHZlcnNpb24kMSA9IFwiMC4xNC45XCI7XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5jb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCdAZmlyZWJhc2UvYXBwJyk7XG5cbmNvbnN0IG5hbWUkcCA9IFwiQGZpcmViYXNlL2FwcC1jb21wYXRcIjtcblxuY29uc3QgbmFtZSRvID0gXCJAZmlyZWJhc2UvYW5hbHl0aWNzLWNvbXBhdFwiO1xuXG5jb25zdCBuYW1lJG4gPSBcIkBmaXJlYmFzZS9hbmFseXRpY3NcIjtcblxuY29uc3QgbmFtZSRtID0gXCJAZmlyZWJhc2UvYXBwLWNoZWNrLWNvbXBhdFwiO1xuXG5jb25zdCBuYW1lJGwgPSBcIkBmaXJlYmFzZS9hcHAtY2hlY2tcIjtcblxuY29uc3QgbmFtZSRrID0gXCJAZmlyZWJhc2UvYXV0aFwiO1xuXG5jb25zdCBuYW1lJGogPSBcIkBmaXJlYmFzZS9hdXRoLWNvbXBhdFwiO1xuXG5jb25zdCBuYW1lJGkgPSBcIkBmaXJlYmFzZS9kYXRhYmFzZVwiO1xuXG5jb25zdCBuYW1lJGggPSBcIkBmaXJlYmFzZS9kYXRhLWNvbm5lY3RcIjtcblxuY29uc3QgbmFtZSRnID0gXCJAZmlyZWJhc2UvZGF0YWJhc2UtY29tcGF0XCI7XG5cbmNvbnN0IG5hbWUkZiA9IFwiQGZpcmViYXNlL2Z1bmN0aW9uc1wiO1xuXG5jb25zdCBuYW1lJGUgPSBcIkBmaXJlYmFzZS9mdW5jdGlvbnMtY29tcGF0XCI7XG5cbmNvbnN0IG5hbWUkZCA9IFwiQGZpcmViYXNlL2luc3RhbGxhdGlvbnNcIjtcblxuY29uc3QgbmFtZSRjID0gXCJAZmlyZWJhc2UvaW5zdGFsbGF0aW9ucy1jb21wYXRcIjtcblxuY29uc3QgbmFtZSRiID0gXCJAZmlyZWJhc2UvbWVzc2FnaW5nXCI7XG5cbmNvbnN0IG5hbWUkYSA9IFwiQGZpcmViYXNlL21lc3NhZ2luZy1jb21wYXRcIjtcblxuY29uc3QgbmFtZSQ5ID0gXCJAZmlyZWJhc2UvcGVyZm9ybWFuY2VcIjtcblxuY29uc3QgbmFtZSQ4ID0gXCJAZmlyZWJhc2UvcGVyZm9ybWFuY2UtY29tcGF0XCI7XG5cbmNvbnN0IG5hbWUkNyA9IFwiQGZpcmViYXNlL3JlbW90ZS1jb25maWdcIjtcblxuY29uc3QgbmFtZSQ2ID0gXCJAZmlyZWJhc2UvcmVtb3RlLWNvbmZpZy1jb21wYXRcIjtcblxuY29uc3QgbmFtZSQ1ID0gXCJAZmlyZWJhc2Uvc3RvcmFnZVwiO1xuXG5jb25zdCBuYW1lJDQgPSBcIkBmaXJlYmFzZS9zdG9yYWdlLWNvbXBhdFwiO1xuXG5jb25zdCBuYW1lJDMgPSBcIkBmaXJlYmFzZS9maXJlc3RvcmVcIjtcblxuY29uc3QgbmFtZSQyID0gXCJAZmlyZWJhc2UvYWlcIjtcblxuY29uc3QgbmFtZSQxID0gXCJAZmlyZWJhc2UvZmlyZXN0b3JlLWNvbXBhdFwiO1xuXG5jb25zdCBuYW1lID0gXCJmaXJlYmFzZVwiO1xuY29uc3QgdmVyc2lvbiA9IFwiMTIuMTAuMFwiO1xuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBUaGUgZGVmYXVsdCBhcHAgbmFtZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5jb25zdCBERUZBVUxUX0VOVFJZX05BTUUgPSAnW0RFRkFVTFRdJztcbmNvbnN0IFBMQVRGT1JNX0xPR19TVFJJTkcgPSB7XG4gICAgW25hbWUkcV06ICdmaXJlLWNvcmUnLFxuICAgIFtuYW1lJHBdOiAnZmlyZS1jb3JlLWNvbXBhdCcsXG4gICAgW25hbWUkbl06ICdmaXJlLWFuYWx5dGljcycsXG4gICAgW25hbWUkb106ICdmaXJlLWFuYWx5dGljcy1jb21wYXQnLFxuICAgIFtuYW1lJGxdOiAnZmlyZS1hcHAtY2hlY2snLFxuICAgIFtuYW1lJG1dOiAnZmlyZS1hcHAtY2hlY2stY29tcGF0JyxcbiAgICBbbmFtZSRrXTogJ2ZpcmUtYXV0aCcsXG4gICAgW25hbWUkal06ICdmaXJlLWF1dGgtY29tcGF0JyxcbiAgICBbbmFtZSRpXTogJ2ZpcmUtcnRkYicsXG4gICAgW25hbWUkaF06ICdmaXJlLWRhdGEtY29ubmVjdCcsXG4gICAgW25hbWUkZ106ICdmaXJlLXJ0ZGItY29tcGF0JyxcbiAgICBbbmFtZSRmXTogJ2ZpcmUtZm4nLFxuICAgIFtuYW1lJGVdOiAnZmlyZS1mbi1jb21wYXQnLFxuICAgIFtuYW1lJGRdOiAnZmlyZS1paWQnLFxuICAgIFtuYW1lJGNdOiAnZmlyZS1paWQtY29tcGF0JyxcbiAgICBbbmFtZSRiXTogJ2ZpcmUtZmNtJyxcbiAgICBbbmFtZSRhXTogJ2ZpcmUtZmNtLWNvbXBhdCcsXG4gICAgW25hbWUkOV06ICdmaXJlLXBlcmYnLFxuICAgIFtuYW1lJDhdOiAnZmlyZS1wZXJmLWNvbXBhdCcsXG4gICAgW25hbWUkN106ICdmaXJlLXJjJyxcbiAgICBbbmFtZSQ2XTogJ2ZpcmUtcmMtY29tcGF0JyxcbiAgICBbbmFtZSQ1XTogJ2ZpcmUtZ2NzJyxcbiAgICBbbmFtZSQ0XTogJ2ZpcmUtZ2NzLWNvbXBhdCcsXG4gICAgW25hbWUkM106ICdmaXJlLWZzdCcsXG4gICAgW25hbWUkMV06ICdmaXJlLWZzdC1jb21wYXQnLFxuICAgIFtuYW1lJDJdOiAnZmlyZS12ZXJ0ZXgnLFxuICAgICdmaXJlLWpzJzogJ2ZpcmUtanMnLCAvLyBQbGF0Zm9ybSBpZGVudGlmaWVyIGZvciBKUyBTREsuXG4gICAgW25hbWVdOiAnZmlyZS1qcy1hbGwnXG59O1xuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuY29uc3QgX2FwcHMgPSBuZXcgTWFwKCk7XG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5jb25zdCBfc2VydmVyQXBwcyA9IG5ldyBNYXAoKTtcbi8qKlxuICogUmVnaXN0ZXJlZCBjb21wb25lbnRzLlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuY29uc3QgX2NvbXBvbmVudHMgPSBuZXcgTWFwKCk7XG4vKipcbiAqIEBwYXJhbSBjb21wb25lbnQgLSB0aGUgY29tcG9uZW50IGJlaW5nIGFkZGVkIHRvIHRoaXMgYXBwJ3MgY29udGFpbmVyXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIF9hZGRDb21wb25lbnQoYXBwLCBjb21wb25lbnQpIHtcbiAgICB0cnkge1xuICAgICAgICBhcHAuY29udGFpbmVyLmFkZENvbXBvbmVudChjb21wb25lbnQpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoYENvbXBvbmVudCAke2NvbXBvbmVudC5uYW1lfSBmYWlsZWQgdG8gcmVnaXN0ZXIgd2l0aCBGaXJlYmFzZUFwcCAke2FwcC5uYW1lfWAsIGUpO1xuICAgIH1cbn1cbi8qKlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBfYWRkT3JPdmVyd3JpdGVDb21wb25lbnQoYXBwLCBjb21wb25lbnQpIHtcbiAgICBhcHAuY29udGFpbmVyLmFkZE9yT3ZlcndyaXRlQ29tcG9uZW50KGNvbXBvbmVudCk7XG59XG4vKipcbiAqXG4gKiBAcGFyYW0gY29tcG9uZW50IC0gdGhlIGNvbXBvbmVudCB0byByZWdpc3RlclxuICogQHJldHVybnMgd2hldGhlciBvciBub3QgdGhlIGNvbXBvbmVudCBpcyByZWdpc3RlcmVkIHN1Y2Nlc3NmdWxseVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBfcmVnaXN0ZXJDb21wb25lbnQoY29tcG9uZW50KSB7XG4gICAgY29uc3QgY29tcG9uZW50TmFtZSA9IGNvbXBvbmVudC5uYW1lO1xuICAgIGlmIChfY29tcG9uZW50cy5oYXMoY29tcG9uZW50TmFtZSkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKGBUaGVyZSB3ZXJlIG11bHRpcGxlIGF0dGVtcHRzIHRvIHJlZ2lzdGVyIGNvbXBvbmVudCAke2NvbXBvbmVudE5hbWV9LmApO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIF9jb21wb25lbnRzLnNldChjb21wb25lbnROYW1lLCBjb21wb25lbnQpO1xuICAgIC8vIGFkZCB0aGUgY29tcG9uZW50IHRvIGV4aXN0aW5nIGFwcCBpbnN0YW5jZXNcbiAgICBmb3IgKGNvbnN0IGFwcCBvZiBfYXBwcy52YWx1ZXMoKSkge1xuICAgICAgICBfYWRkQ29tcG9uZW50KGFwcCwgY29tcG9uZW50KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzZXJ2ZXJBcHAgb2YgX3NlcnZlckFwcHMudmFsdWVzKCkpIHtcbiAgICAgICAgX2FkZENvbXBvbmVudChzZXJ2ZXJBcHAsIGNvbXBvbmVudCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuLyoqXG4gKlxuICogQHBhcmFtIGFwcCAtIEZpcmViYXNlQXBwIGluc3RhbmNlXG4gKiBAcGFyYW0gbmFtZSAtIHNlcnZpY2UgbmFtZVxuICpcbiAqIEByZXR1cm5zIHRoZSBwcm92aWRlciBmb3IgdGhlIHNlcnZpY2Ugd2l0aCB0aGUgbWF0Y2hpbmcgbmFtZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBfZ2V0UHJvdmlkZXIoYXBwLCBuYW1lKSB7XG4gICAgY29uc3QgaGVhcnRiZWF0Q29udHJvbGxlciA9IGFwcC5jb250YWluZXJcbiAgICAgICAgLmdldFByb3ZpZGVyKCdoZWFydGJlYXQnKVxuICAgICAgICAuZ2V0SW1tZWRpYXRlKHsgb3B0aW9uYWw6IHRydWUgfSk7XG4gICAgaWYgKGhlYXJ0YmVhdENvbnRyb2xsZXIpIHtcbiAgICAgICAgdm9pZCBoZWFydGJlYXRDb250cm9sbGVyLnRyaWdnZXJIZWFydGJlYXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGFwcC5jb250YWluZXIuZ2V0UHJvdmlkZXIobmFtZSk7XG59XG4vKipcbiAqXG4gKiBAcGFyYW0gYXBwIC0gRmlyZWJhc2VBcHAgaW5zdGFuY2VcbiAqIEBwYXJhbSBuYW1lIC0gc2VydmljZSBuYW1lXG4gKiBAcGFyYW0gaW5zdGFuY2VJZGVudGlmaWVyIC0gc2VydmljZSBpbnN0YW5jZSBpZGVudGlmaWVyIGluIGNhc2UgdGhlIHNlcnZpY2Ugc3VwcG9ydHMgbXVsdGlwbGUgaW5zdGFuY2VzXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIF9yZW1vdmVTZXJ2aWNlSW5zdGFuY2UoYXBwLCBuYW1lLCBpbnN0YW5jZUlkZW50aWZpZXIgPSBERUZBVUxUX0VOVFJZX05BTUUpIHtcbiAgICBfZ2V0UHJvdmlkZXIoYXBwLCBuYW1lKS5jbGVhckluc3RhbmNlKGluc3RhbmNlSWRlbnRpZmllcik7XG59XG4vKipcbiAqXG4gKiBAcGFyYW0gb2JqIC0gYW4gb2JqZWN0IG9mIHR5cGUgRmlyZWJhc2VBcHAsIEZpcmViYXNlT3B0aW9ucyBvciBGaXJlYmFzZUFwcFNldHRpbmdzLlxuICpcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHByb3ZpZGUgb2JqZWN0IGlzIG9mIHR5cGUgRmlyZWJhc2VBcHAuXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIF9pc0ZpcmViYXNlQXBwKG9iaikge1xuICAgIHJldHVybiBvYmoub3B0aW9ucyAhPT0gdW5kZWZpbmVkO1xufVxuLyoqXG4gKlxuICogQHBhcmFtIG9iaiAtIGFuIG9iamVjdCBvZiB0eXBlIEZpcmViYXNlQXBwLCBGaXJlYmFzZU9wdGlvbnMgb3IgRmlyZWJhc2VBcHBTZXR0aW5ncy5cbiAqXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBwcm92aWRlZCBvYmplY3QgaXMgb2YgdHlwZSBGaXJlYmFzZVNlcnZlckFwcEltcGwuXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIF9pc0ZpcmViYXNlU2VydmVyQXBwU2V0dGluZ3Mob2JqKSB7XG4gICAgaWYgKF9pc0ZpcmViYXNlQXBwKG9iaikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gKCdhdXRoSWRUb2tlbicgaW4gb2JqIHx8XG4gICAgICAgICdhcHBDaGVja1Rva2VuJyBpbiBvYmogfHxcbiAgICAgICAgJ3JlbGVhc2VPbkRlcmVmJyBpbiBvYmogfHxcbiAgICAgICAgJ2F1dG9tYXRpY0RhdGFDb2xsZWN0aW9uRW5hYmxlZCcgaW4gb2JqKTtcbn1cbi8qKlxuICpcbiAqIEBwYXJhbSBvYmogLSBhbiBvYmplY3Qgb2YgdHlwZSBGaXJlYmFzZUFwcC5cbiAqXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBwcm92aWRlZCBvYmplY3QgaXMgb2YgdHlwZSBGaXJlYmFzZVNlcnZlckFwcEltcGwuXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIF9pc0ZpcmViYXNlU2VydmVyQXBwKG9iaikge1xuICAgIGlmIChvYmogPT09IG51bGwgfHwgb2JqID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gb2JqLnNldHRpbmdzICE9PSB1bmRlZmluZWQ7XG59XG4vKipcbiAqIFRlc3Qgb25seVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBfY2xlYXJDb21wb25lbnRzKCkge1xuICAgIF9jb21wb25lbnRzLmNsZWFyKCk7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5jb25zdCBFUlJPUlMgPSB7XG4gICAgW1wibm8tYXBwXCIgLyogQXBwRXJyb3IuTk9fQVBQICovXTogXCJObyBGaXJlYmFzZSBBcHAgJ3skYXBwTmFtZX0nIGhhcyBiZWVuIGNyZWF0ZWQgLSBcIiArXG4gICAgICAgICdjYWxsIGluaXRpYWxpemVBcHAoKSBmaXJzdCcsXG4gICAgW1wiYmFkLWFwcC1uYW1lXCIgLyogQXBwRXJyb3IuQkFEX0FQUF9OQU1FICovXTogXCJJbGxlZ2FsIEFwcCBuYW1lOiAneyRhcHBOYW1lfSdcIixcbiAgICBbXCJkdXBsaWNhdGUtYXBwXCIgLyogQXBwRXJyb3IuRFVQTElDQVRFX0FQUCAqL106IFwiRmlyZWJhc2UgQXBwIG5hbWVkICd7JGFwcE5hbWV9JyBhbHJlYWR5IGV4aXN0cyB3aXRoIGRpZmZlcmVudCBvcHRpb25zIG9yIGNvbmZpZ1wiLFxuICAgIFtcImFwcC1kZWxldGVkXCIgLyogQXBwRXJyb3IuQVBQX0RFTEVURUQgKi9dOiBcIkZpcmViYXNlIEFwcCBuYW1lZCAneyRhcHBOYW1lfScgYWxyZWFkeSBkZWxldGVkXCIsXG4gICAgW1wic2VydmVyLWFwcC1kZWxldGVkXCIgLyogQXBwRXJyb3IuU0VSVkVSX0FQUF9ERUxFVEVEICovXTogJ0ZpcmViYXNlIFNlcnZlciBBcHAgaGFzIGJlZW4gZGVsZXRlZCcsXG4gICAgW1wibm8tb3B0aW9uc1wiIC8qIEFwcEVycm9yLk5PX09QVElPTlMgKi9dOiAnTmVlZCB0byBwcm92aWRlIG9wdGlvbnMsIHdoZW4gbm90IGJlaW5nIGRlcGxveWVkIHRvIGhvc3RpbmcgdmlhIHNvdXJjZS4nLFxuICAgIFtcImludmFsaWQtYXBwLWFyZ3VtZW50XCIgLyogQXBwRXJyb3IuSU5WQUxJRF9BUFBfQVJHVU1FTlQgKi9dOiAnZmlyZWJhc2UueyRhcHBOYW1lfSgpIHRha2VzIGVpdGhlciBubyBhcmd1bWVudCBvciBhICcgK1xuICAgICAgICAnRmlyZWJhc2UgQXBwIGluc3RhbmNlLicsXG4gICAgW1wiaW52YWxpZC1sb2ctYXJndW1lbnRcIiAvKiBBcHBFcnJvci5JTlZBTElEX0xPR19BUkdVTUVOVCAqL106ICdGaXJzdCBhcmd1bWVudCB0byBgb25Mb2dgIG11c3QgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLicsXG4gICAgW1wiaWRiLW9wZW5cIiAvKiBBcHBFcnJvci5JREJfT1BFTiAqL106ICdFcnJvciB0aHJvd24gd2hlbiBvcGVuaW5nIEluZGV4ZWREQi4gT3JpZ2luYWwgZXJyb3I6IHskb3JpZ2luYWxFcnJvck1lc3NhZ2V9LicsXG4gICAgW1wiaWRiLWdldFwiIC8qIEFwcEVycm9yLklEQl9HRVQgKi9dOiAnRXJyb3IgdGhyb3duIHdoZW4gcmVhZGluZyBmcm9tIEluZGV4ZWREQi4gT3JpZ2luYWwgZXJyb3I6IHskb3JpZ2luYWxFcnJvck1lc3NhZ2V9LicsXG4gICAgW1wiaWRiLXNldFwiIC8qIEFwcEVycm9yLklEQl9XUklURSAqL106ICdFcnJvciB0aHJvd24gd2hlbiB3cml0aW5nIHRvIEluZGV4ZWREQi4gT3JpZ2luYWwgZXJyb3I6IHskb3JpZ2luYWxFcnJvck1lc3NhZ2V9LicsXG4gICAgW1wiaWRiLWRlbGV0ZVwiIC8qIEFwcEVycm9yLklEQl9ERUxFVEUgKi9dOiAnRXJyb3IgdGhyb3duIHdoZW4gZGVsZXRpbmcgZnJvbSBJbmRleGVkREIuIE9yaWdpbmFsIGVycm9yOiB7JG9yaWdpbmFsRXJyb3JNZXNzYWdlfS4nLFxuICAgIFtcImZpbmFsaXphdGlvbi1yZWdpc3RyeS1ub3Qtc3VwcG9ydGVkXCIgLyogQXBwRXJyb3IuRklOQUxJWkFUSU9OX1JFR0lTVFJZX05PVF9TVVBQT1JURUQgKi9dOiAnRmlyZWJhc2VTZXJ2ZXJBcHAgZGVsZXRlT25EZXJlZiBmaWVsZCBkZWZpbmVkIGJ1dCB0aGUgSlMgcnVudGltZSBkb2VzIG5vdCBzdXBwb3J0IEZpbmFsaXphdGlvblJlZ2lzdHJ5LicsXG4gICAgW1wiaW52YWxpZC1zZXJ2ZXItYXBwLWVudmlyb25tZW50XCIgLyogQXBwRXJyb3IuSU5WQUxJRF9TRVJWRVJfQVBQX0VOVklST05NRU5UICovXTogJ0ZpcmViYXNlU2VydmVyQXBwIGlzIG5vdCBmb3IgdXNlIGluIGJyb3dzZXIgZW52aXJvbm1lbnRzLidcbn07XG5jb25zdCBFUlJPUl9GQUNUT1JZID0gbmV3IEVycm9yRmFjdG9yeSgnYXBwJywgJ0ZpcmViYXNlJywgRVJST1JTKTtcblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmNsYXNzIEZpcmViYXNlQXBwSW1wbCB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucywgY29uZmlnLCBjb250YWluZXIpIHtcbiAgICAgICAgdGhpcy5faXNEZWxldGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX29wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0geyAuLi5jb25maWcgfTtcbiAgICAgICAgdGhpcy5fbmFtZSA9IGNvbmZpZy5uYW1lO1xuICAgICAgICB0aGlzLl9hdXRvbWF0aWNEYXRhQ29sbGVjdGlvbkVuYWJsZWQgPVxuICAgICAgICAgICAgY29uZmlnLmF1dG9tYXRpY0RhdGFDb2xsZWN0aW9uRW5hYmxlZDtcbiAgICAgICAgdGhpcy5fY29udGFpbmVyID0gY29udGFpbmVyO1xuICAgICAgICB0aGlzLmNvbnRhaW5lci5hZGRDb21wb25lbnQobmV3IENvbXBvbmVudCgnYXBwJywgKCkgPT4gdGhpcywgXCJQVUJMSUNcIiAvKiBDb21wb25lbnRUeXBlLlBVQkxJQyAqLykpO1xuICAgIH1cbiAgICBnZXQgYXV0b21hdGljRGF0YUNvbGxlY3Rpb25FbmFibGVkKCkge1xuICAgICAgICB0aGlzLmNoZWNrRGVzdHJveWVkKCk7XG4gICAgICAgIHJldHVybiB0aGlzLl9hdXRvbWF0aWNEYXRhQ29sbGVjdGlvbkVuYWJsZWQ7XG4gICAgfVxuICAgIHNldCBhdXRvbWF0aWNEYXRhQ29sbGVjdGlvbkVuYWJsZWQodmFsKSB7XG4gICAgICAgIHRoaXMuY2hlY2tEZXN0cm95ZWQoKTtcbiAgICAgICAgdGhpcy5fYXV0b21hdGljRGF0YUNvbGxlY3Rpb25FbmFibGVkID0gdmFsO1xuICAgIH1cbiAgICBnZXQgbmFtZSgpIHtcbiAgICAgICAgdGhpcy5jaGVja0Rlc3Ryb3llZCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5fbmFtZTtcbiAgICB9XG4gICAgZ2V0IG9wdGlvbnMoKSB7XG4gICAgICAgIHRoaXMuY2hlY2tEZXN0cm95ZWQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbnM7XG4gICAgfVxuICAgIGdldCBjb25maWcoKSB7XG4gICAgICAgIHRoaXMuY2hlY2tEZXN0cm95ZWQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcbiAgICB9XG4gICAgZ2V0IGNvbnRhaW5lcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcbiAgICB9XG4gICAgZ2V0IGlzRGVsZXRlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzRGVsZXRlZDtcbiAgICB9XG4gICAgc2V0IGlzRGVsZXRlZCh2YWwpIHtcbiAgICAgICAgdGhpcy5faXNEZWxldGVkID0gdmFsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGlzIGZ1bmN0aW9uIHdpbGwgdGhyb3cgYW4gRXJyb3IgaWYgdGhlIEFwcCBoYXMgYWxyZWFkeSBiZWVuIGRlbGV0ZWQgLVxuICAgICAqIHVzZSBiZWZvcmUgcGVyZm9ybWluZyBBUEkgYWN0aW9ucyBvbiB0aGUgQXBwLlxuICAgICAqL1xuICAgIGNoZWNrRGVzdHJveWVkKCkge1xuICAgICAgICBpZiAodGhpcy5pc0RlbGV0ZWQpIHtcbiAgICAgICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiYXBwLWRlbGV0ZWRcIiAvKiBBcHBFcnJvci5BUFBfREVMRVRFRCAqLywgeyBhcHBOYW1lOiB0aGlzLl9uYW1lIH0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLy8gUGFyc2UgdGhlIHRva2VuIGFuZCBjaGVjayB0byBzZWUgaWYgdGhlIGBleHBgIGNsYWltIGlzIGluIHRoZSBmdXR1cmUuXG4vLyBSZXBvcnRzIGFuIGVycm9yIHRvIHRoZSBjb25zb2xlIGlmIHRoZSB0b2tlbiBvciBjbGFpbSBjb3VsZCBub3QgYmUgcGFyc2VkLCBvciBpZiBgZXhwYCBpcyBpblxuLy8gdGhlIHBhc3QuXG5mdW5jdGlvbiB2YWxpZGF0ZVRva2VuVFRMKGJhc2U2NFRva2VuLCB0b2tlbk5hbWUpIHtcbiAgICBjb25zdCBzZWNvbmRQYXJ0ID0gYmFzZTY0RGVjb2RlKGJhc2U2NFRva2VuLnNwbGl0KCcuJylbMV0pO1xuICAgIGlmIChzZWNvbmRQYXJ0ID09PSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEZpcmViYXNlU2VydmVyQXBwICR7dG9rZW5OYW1lfSBpcyBpbnZhbGlkOiBzZWNvbmQgcGFydCBjb3VsZCBub3QgYmUgcGFyc2VkLmApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGV4cENsYWltID0gSlNPTi5wYXJzZShzZWNvbmRQYXJ0KS5leHA7XG4gICAgaWYgKGV4cENsYWltID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRmlyZWJhc2VTZXJ2ZXJBcHAgJHt0b2tlbk5hbWV9IGlzIGludmFsaWQ6IGV4cGlyYXRpb24gY2xhaW0gY291bGQgbm90IGJlIHBhcnNlZGApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGV4cCA9IEpTT04ucGFyc2Uoc2Vjb25kUGFydCkuZXhwICogMTAwMDtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBjb25zdCBkaWZmID0gZXhwIC0gbm93O1xuICAgIGlmIChkaWZmIDw9IDApIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRmlyZWJhc2VTZXJ2ZXJBcHAgJHt0b2tlbk5hbWV9IGlzIGludmFsaWQ6IHRoZSB0b2tlbiBoYXMgZXhwaXJlZC5gKTtcbiAgICB9XG59XG5jbGFzcyBGaXJlYmFzZVNlcnZlckFwcEltcGwgZXh0ZW5kcyBGaXJlYmFzZUFwcEltcGwge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMsIHNlcnZlckNvbmZpZywgbmFtZSwgY29udGFpbmVyKSB7XG4gICAgICAgIC8vIEJ1aWxkIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVycyBmb3IgdGhlIEZpcmViYXNlQXBwSW1wbCBiYXNlIGNsYXNzLlxuICAgICAgICBjb25zdCBhdXRvbWF0aWNEYXRhQ29sbGVjdGlvbkVuYWJsZWQgPSBzZXJ2ZXJDb25maWcuYXV0b21hdGljRGF0YUNvbGxlY3Rpb25FbmFibGVkICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gc2VydmVyQ29uZmlnLmF1dG9tYXRpY0RhdGFDb2xsZWN0aW9uRW5hYmxlZFxuICAgICAgICAgICAgOiB0cnVlO1xuICAgICAgICAvLyBDcmVhdGUgdGhlIEZpcmViYXNlQXBwU2V0dGluZ3Mgb2JqZWN0IGZvciB0aGUgRmlyZWJhc2VBcHBJbXAgY29uc3RydWN0b3IuXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICBhdXRvbWF0aWNEYXRhQ29sbGVjdGlvbkVuYWJsZWRcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKG9wdGlvbnMuYXBpS2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIENvbnN0cnVjdCB0aGUgcGFyZW50IEZpcmViYXNlQXBwSW1wIG9iamVjdC5cbiAgICAgICAgICAgIHN1cGVyKG9wdGlvbnMsIGNvbmZpZywgY29udGFpbmVyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGFwcEltcGwgPSBvcHRpb25zO1xuICAgICAgICAgICAgc3VwZXIoYXBwSW1wbC5vcHRpb25zLCBjb25maWcsIGNvbnRhaW5lcik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm93IGNvbnN0cnVjdCB0aGUgZGF0YSBmb3IgdGhlIEZpcmViYXNlU2VydmVyQXBwSW1wbC5cbiAgICAgICAgdGhpcy5fc2VydmVyQ29uZmlnID0ge1xuICAgICAgICAgICAgYXV0b21hdGljRGF0YUNvbGxlY3Rpb25FbmFibGVkLFxuICAgICAgICAgICAgLi4uc2VydmVyQ29uZmlnXG4gICAgICAgIH07XG4gICAgICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBjdXJyZW50IHRpbWUgaXMgd2l0aGluIHRoZSBgYXV0aElkdG9rZW5gIHdpbmRvdyBvZiB2YWxpZGl0eS5cbiAgICAgICAgaWYgKHRoaXMuX3NlcnZlckNvbmZpZy5hdXRoSWRUb2tlbikge1xuICAgICAgICAgICAgdmFsaWRhdGVUb2tlblRUTCh0aGlzLl9zZXJ2ZXJDb25maWcuYXV0aElkVG9rZW4sICdhdXRoSWRUb2tlbicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBjdXJyZW50IHRpbWUgaXMgd2l0aGluIHRoZSBgYXBwQ2hlY2tUb2tlbmAgd2luZG93IG9mIHZhbGlkaXR5LlxuICAgICAgICBpZiAodGhpcy5fc2VydmVyQ29uZmlnLmFwcENoZWNrVG9rZW4pIHtcbiAgICAgICAgICAgIHZhbGlkYXRlVG9rZW5UVEwodGhpcy5fc2VydmVyQ29uZmlnLmFwcENoZWNrVG9rZW4sICdhcHBDaGVja1Rva2VuJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZmluYWxpemF0aW9uUmVnaXN0cnkgPSBudWxsO1xuICAgICAgICBpZiAodHlwZW9mIEZpbmFsaXphdGlvblJlZ2lzdHJ5ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhpcy5fZmluYWxpemF0aW9uUmVnaXN0cnkgPSBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuYXV0b21hdGljQ2xlYW51cCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcmVmQ291bnQgPSAwO1xuICAgICAgICB0aGlzLmluY1JlZkNvdW50KHRoaXMuX3NlcnZlckNvbmZpZy5yZWxlYXNlT25EZXJlZik7XG4gICAgICAgIC8vIERvIG5vdCByZXRhaW4gYSBoYXJkIHJlZmVyZW5jZSB0byB0aGUgZHJlZiBvYmplY3QsIG90aGVyd2lzZSB0aGUgRmluYWxpemF0aW9uUmVnaXN0cnlcbiAgICAgICAgLy8gd2lsbCBuZXZlciB0cmlnZ2VyLlxuICAgICAgICB0aGlzLl9zZXJ2ZXJDb25maWcucmVsZWFzZU9uRGVyZWYgPSB1bmRlZmluZWQ7XG4gICAgICAgIHNlcnZlckNvbmZpZy5yZWxlYXNlT25EZXJlZiA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmVnaXN0ZXJWZXJzaW9uKG5hbWUkcSwgdmVyc2lvbiQxLCAnc2VydmVyYXBwJyk7XG4gICAgfVxuICAgIHRvSlNPTigpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0IHJlZkNvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVmQ291bnQ7XG4gICAgfVxuICAgIC8vIEluY3JlbWVudCB0aGUgcmVmZXJlbmNlIGNvdW50IG9mIHRoaXMgc2VydmVyIGFwcC4gSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkLCByZWdpc3RlciBpdFxuICAgIC8vIHdpdGggdGhlIGZpbmFsaXphdGlvbiByZWdpc3RyeS5cbiAgICBpbmNSZWZDb3VudChvYmopIHtcbiAgICAgICAgaWYgKHRoaXMuaXNEZWxldGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcmVmQ291bnQrKztcbiAgICAgICAgaWYgKG9iaiAhPT0gdW5kZWZpbmVkICYmIHRoaXMuX2ZpbmFsaXphdGlvblJlZ2lzdHJ5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9maW5hbGl6YXRpb25SZWdpc3RyeS5yZWdpc3RlcihvYmosIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIERlY3JlbWVudCB0aGUgcmVmZXJlbmNlIGNvdW50LlxuICAgIGRlY1JlZkNvdW50KCkge1xuICAgICAgICBpZiAodGhpcy5pc0RlbGV0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtLXRoaXMuX3JlZkNvdW50O1xuICAgIH1cbiAgICAvLyBJbnZva2VkIGJ5IHRoZSBGaW5hbGl6YXRpb25SZWdpc3RyeSBjYWxsYmFjayB0byBub3RlIHRoYXQgdGhpcyBhcHAgc2hvdWxkIGdvIHRocm91Z2ggaXRzXG4gICAgLy8gcmVmZXJlbmNlIGNvdW50cyBhbmQgZGVsZXRlIGl0c2VsZiBpZiBubyByZWZlcmVuY2UgY291bnQgcmVtYWluLiBUaGUgY29vcmRpbmF0aW5nIGxvZ2ljIHRoYXRcbiAgICAvLyBoYW5kbGVzIHRoaXMgaXMgaW4gZGVsZXRlQXBwKC4uLikuXG4gICAgYXV0b21hdGljQ2xlYW51cCgpIHtcbiAgICAgICAgdm9pZCBkZWxldGVBcHAodGhpcyk7XG4gICAgfVxuICAgIGdldCBzZXR0aW5ncygpIHtcbiAgICAgICAgdGhpcy5jaGVja0Rlc3Ryb3llZCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VydmVyQ29uZmlnO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGlzIGZ1bmN0aW9uIHdpbGwgdGhyb3cgYW4gRXJyb3IgaWYgdGhlIEFwcCBoYXMgYWxyZWFkeSBiZWVuIGRlbGV0ZWQgLVxuICAgICAqIHVzZSBiZWZvcmUgcGVyZm9ybWluZyBBUEkgYWN0aW9ucyBvbiB0aGUgQXBwLlxuICAgICAqL1xuICAgIGNoZWNrRGVzdHJveWVkKCkge1xuICAgICAgICBpZiAodGhpcy5pc0RlbGV0ZWQpIHtcbiAgICAgICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwic2VydmVyLWFwcC1kZWxldGVkXCIgLyogQXBwRXJyb3IuU0VSVkVSX0FQUF9ERUxFVEVEICovKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogVGhlIGN1cnJlbnQgU0RLIHZlcnNpb24uXG4gKlxuICogQHB1YmxpY1xuICovXG5jb25zdCBTREtfVkVSU0lPTiA9IHZlcnNpb247XG5mdW5jdGlvbiBpbml0aWFsaXplQXBwKF9vcHRpb25zLCByYXdDb25maWcgPSB7fSkge1xuICAgIGxldCBvcHRpb25zID0gX29wdGlvbnM7XG4gICAgaWYgKHR5cGVvZiByYXdDb25maWcgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSByYXdDb25maWc7XG4gICAgICAgIHJhd0NvbmZpZyA9IHsgbmFtZSB9O1xuICAgIH1cbiAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICAgIG5hbWU6IERFRkFVTFRfRU5UUllfTkFNRSxcbiAgICAgICAgYXV0b21hdGljRGF0YUNvbGxlY3Rpb25FbmFibGVkOiB0cnVlLFxuICAgICAgICAuLi5yYXdDb25maWdcbiAgICB9O1xuICAgIGNvbnN0IG5hbWUgPSBjb25maWcubmFtZTtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnIHx8ICFuYW1lKSB7XG4gICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiYmFkLWFwcC1uYW1lXCIgLyogQXBwRXJyb3IuQkFEX0FQUF9OQU1FICovLCB7XG4gICAgICAgICAgICBhcHBOYW1lOiBTdHJpbmcobmFtZSlcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSBnZXREZWZhdWx0QXBwQ29uZmlnKCkpO1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcIm5vLW9wdGlvbnNcIiAvKiBBcHBFcnJvci5OT19PUFRJT05TICovKTtcbiAgICB9XG4gICAgY29uc3QgZXhpc3RpbmdBcHAgPSBfYXBwcy5nZXQobmFtZSk7XG4gICAgaWYgKGV4aXN0aW5nQXBwKSB7XG4gICAgICAgIC8vIHJldHVybiB0aGUgZXhpc3RpbmcgYXBwIGlmIG9wdGlvbnMgYW5kIGNvbmZpZyBkZWVwIGVxdWFsIHRoZSBvbmVzIGluIHRoZSBleGlzdGluZyBhcHAuXG4gICAgICAgIGlmIChkZWVwRXF1YWwob3B0aW9ucywgZXhpc3RpbmdBcHAub3B0aW9ucykgJiZcbiAgICAgICAgICAgIGRlZXBFcXVhbChjb25maWcsIGV4aXN0aW5nQXBwLmNvbmZpZykpIHtcbiAgICAgICAgICAgIHJldHVybiBleGlzdGluZ0FwcDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiZHVwbGljYXRlLWFwcFwiIC8qIEFwcEVycm9yLkRVUExJQ0FURV9BUFAgKi8sIHsgYXBwTmFtZTogbmFtZSB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBjb250YWluZXIgPSBuZXcgQ29tcG9uZW50Q29udGFpbmVyKG5hbWUpO1xuICAgIGZvciAoY29uc3QgY29tcG9uZW50IG9mIF9jb21wb25lbnRzLnZhbHVlcygpKSB7XG4gICAgICAgIGNvbnRhaW5lci5hZGRDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICB9XG4gICAgY29uc3QgbmV3QXBwID0gbmV3IEZpcmViYXNlQXBwSW1wbChvcHRpb25zLCBjb25maWcsIGNvbnRhaW5lcik7XG4gICAgX2FwcHMuc2V0KG5hbWUsIG5ld0FwcCk7XG4gICAgcmV0dXJuIG5ld0FwcDtcbn1cbmZ1bmN0aW9uIGluaXRpYWxpemVTZXJ2ZXJBcHAoX29wdGlvbnMsIF9zZXJ2ZXJBcHBDb25maWcgPSB7fSkge1xuICAgIGlmIChpc0Jyb3dzZXIoKSAmJiAhaXNXZWJXb3JrZXIoKSkge1xuICAgICAgICAvLyBGaXJlYmFzZVNlcnZlckFwcCBpc24ndCBkZXNpZ25lZCB0byBiZSBydW4gaW4gYnJvd3NlcnMuXG4gICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiaW52YWxpZC1zZXJ2ZXItYXBwLWVudmlyb25tZW50XCIgLyogQXBwRXJyb3IuSU5WQUxJRF9TRVJWRVJfQVBQX0VOVklST05NRU5UICovKTtcbiAgICB9XG4gICAgbGV0IGZpcmViYXNlT3B0aW9ucztcbiAgICBsZXQgc2VydmVyQXBwU2V0dGluZ3MgPSBfc2VydmVyQXBwQ29uZmlnIHx8IHt9O1xuICAgIGlmIChfb3B0aW9ucykge1xuICAgICAgICBpZiAoX2lzRmlyZWJhc2VBcHAoX29wdGlvbnMpKSB7XG4gICAgICAgICAgICBmaXJlYmFzZU9wdGlvbnMgPSBfb3B0aW9ucy5vcHRpb25zO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKF9pc0ZpcmViYXNlU2VydmVyQXBwU2V0dGluZ3MoX29wdGlvbnMpKSB7XG4gICAgICAgICAgICBzZXJ2ZXJBcHBTZXR0aW5ncyA9IF9vcHRpb25zO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZmlyZWJhc2VPcHRpb25zID0gX29wdGlvbnM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHNlcnZlckFwcFNldHRpbmdzLmF1dG9tYXRpY0RhdGFDb2xsZWN0aW9uRW5hYmxlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNlcnZlckFwcFNldHRpbmdzLmF1dG9tYXRpY0RhdGFDb2xsZWN0aW9uRW5hYmxlZCA9IHRydWU7XG4gICAgfVxuICAgIGZpcmViYXNlT3B0aW9ucyB8fCAoZmlyZWJhc2VPcHRpb25zID0gZ2V0RGVmYXVsdEFwcENvbmZpZygpKTtcbiAgICBpZiAoIWZpcmViYXNlT3B0aW9ucykge1xuICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcIm5vLW9wdGlvbnNcIiAvKiBBcHBFcnJvci5OT19PUFRJT05TICovKTtcbiAgICB9XG4gICAgLy8gQnVpbGQgYW4gYXBwIG5hbWUgYmFzZWQgb24gYSBoYXNoIG9mIHRoZSBjb25maWd1cmF0aW9uIG9wdGlvbnMuXG4gICAgY29uc3QgbmFtZU9iaiA9IHtcbiAgICAgICAgLi4uc2VydmVyQXBwU2V0dGluZ3MsXG4gICAgICAgIC4uLmZpcmViYXNlT3B0aW9uc1xuICAgIH07XG4gICAgLy8gSG93ZXZlciwgRG8gbm90IG1hbmdsZSB0aGUgbmFtZSBiYXNlZCBvbiByZWxlYXNlT25EZXJlZiwgc2luY2UgaXQgd2lsbCB2YXJ5IGJldHdlZW4gdGhlXG4gICAgLy8gY29uc3RydWN0aW9uIG9mIEZpcmViYXNlU2VydmVyQXBwIGluc3RhbmNlcy4gRm9yIGV4YW1wbGUsIGlmIHRoZSBvYmplY3QgaXMgdGhlIHJlcXVlc3QgaGVhZGVycy5cbiAgICBpZiAobmFtZU9iai5yZWxlYXNlT25EZXJlZiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlbGV0ZSBuYW1lT2JqLnJlbGVhc2VPbkRlcmVmO1xuICAgIH1cbiAgICBjb25zdCBoYXNoQ29kZSA9IChzKSA9PiB7XG4gICAgICAgIHJldHVybiBbLi4uc10ucmVkdWNlKChoYXNoLCBjKSA9PiAoTWF0aC5pbXVsKDMxLCBoYXNoKSArIGMuY2hhckNvZGVBdCgwKSkgfCAwLCAwKTtcbiAgICB9O1xuICAgIGlmIChzZXJ2ZXJBcHBTZXR0aW5ncy5yZWxlYXNlT25EZXJlZiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRmluYWxpemF0aW9uUmVnaXN0cnkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcImZpbmFsaXphdGlvbi1yZWdpc3RyeS1ub3Qtc3VwcG9ydGVkXCIgLyogQXBwRXJyb3IuRklOQUxJWkFUSU9OX1JFR0lTVFJZX05PVF9TVVBQT1JURUQgKi8sIHt9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBuYW1lU3RyaW5nID0gJycgKyBoYXNoQ29kZShKU09OLnN0cmluZ2lmeShuYW1lT2JqKSk7XG4gICAgY29uc3QgZXhpc3RpbmdBcHAgPSBfc2VydmVyQXBwcy5nZXQobmFtZVN0cmluZyk7XG4gICAgaWYgKGV4aXN0aW5nQXBwKSB7XG4gICAgICAgIGV4aXN0aW5nQXBwLmluY1JlZkNvdW50KHNlcnZlckFwcFNldHRpbmdzLnJlbGVhc2VPbkRlcmVmKTtcbiAgICAgICAgcmV0dXJuIGV4aXN0aW5nQXBwO1xuICAgIH1cbiAgICBjb25zdCBjb250YWluZXIgPSBuZXcgQ29tcG9uZW50Q29udGFpbmVyKG5hbWVTdHJpbmcpO1xuICAgIGZvciAoY29uc3QgY29tcG9uZW50IG9mIF9jb21wb25lbnRzLnZhbHVlcygpKSB7XG4gICAgICAgIGNvbnRhaW5lci5hZGRDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICB9XG4gICAgY29uc3QgbmV3QXBwID0gbmV3IEZpcmViYXNlU2VydmVyQXBwSW1wbChmaXJlYmFzZU9wdGlvbnMsIHNlcnZlckFwcFNldHRpbmdzLCBuYW1lU3RyaW5nLCBjb250YWluZXIpO1xuICAgIF9zZXJ2ZXJBcHBzLnNldChuYW1lU3RyaW5nLCBuZXdBcHApO1xuICAgIHJldHVybiBuZXdBcHA7XG59XG4vKipcbiAqIFJldHJpZXZlcyBhIHtAbGluayBAZmlyZWJhc2UvYXBwI0ZpcmViYXNlQXBwfSBpbnN0YW5jZS5cbiAqXG4gKiBXaGVuIGNhbGxlZCB3aXRoIG5vIGFyZ3VtZW50cywgdGhlIGRlZmF1bHQgYXBwIGlzIHJldHVybmVkLiBXaGVuIGFuIGFwcCBuYW1lXG4gKiBpcyBwcm92aWRlZCwgdGhlIGFwcCBjb3JyZXNwb25kaW5nIHRvIHRoYXQgbmFtZSBpcyByZXR1cm5lZC5cbiAqXG4gKiBBbiBleGNlcHRpb24gaXMgdGhyb3duIGlmIHRoZSBhcHAgYmVpbmcgcmV0cmlldmVkIGhhcyBub3QgeWV0IGJlZW5cbiAqIGluaXRpYWxpemVkLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGBqYXZhc2NyaXB0XG4gKiAvLyBSZXR1cm4gdGhlIGRlZmF1bHQgYXBwXG4gKiBjb25zdCBhcHAgPSBnZXRBcHAoKTtcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGBqYXZhc2NyaXB0XG4gKiAvLyBSZXR1cm4gYSBuYW1lZCBhcHBcbiAqIGNvbnN0IG90aGVyQXBwID0gZ2V0QXBwKFwib3RoZXJBcHBcIik7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gbmFtZSAtIE9wdGlvbmFsIG5hbWUgb2YgdGhlIGFwcCB0byByZXR1cm4uIElmIG5vIG5hbWUgaXNcbiAqICAgcHJvdmlkZWQsIHRoZSBkZWZhdWx0IGlzIGBcIltERUZBVUxUXVwiYC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgYXBwIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHByb3ZpZGVkIGFwcCBuYW1lLlxuICogICBJZiBubyBhcHAgbmFtZSBpcyBwcm92aWRlZCwgdGhlIGRlZmF1bHQgYXBwIGlzIHJldHVybmVkLlxuICpcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gZ2V0QXBwKG5hbWUgPSBERUZBVUxUX0VOVFJZX05BTUUpIHtcbiAgICBjb25zdCBhcHAgPSBfYXBwcy5nZXQobmFtZSk7XG4gICAgaWYgKCFhcHAgJiYgbmFtZSA9PT0gREVGQVVMVF9FTlRSWV9OQU1FICYmIGdldERlZmF1bHRBcHBDb25maWcoKSkge1xuICAgICAgICByZXR1cm4gaW5pdGlhbGl6ZUFwcCgpO1xuICAgIH1cbiAgICBpZiAoIWFwcCkge1xuICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcIm5vLWFwcFwiIC8qIEFwcEVycm9yLk5PX0FQUCAqLywgeyBhcHBOYW1lOiBuYW1lIH0pO1xuICAgIH1cbiAgICByZXR1cm4gYXBwO1xufVxuLyoqXG4gKiBBIChyZWFkLW9ubHkpIGFycmF5IG9mIGFsbCBpbml0aWFsaXplZCBhcHBzLlxuICogQHB1YmxpY1xuICovXG5mdW5jdGlvbiBnZXRBcHBzKCkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKF9hcHBzLnZhbHVlcygpKTtcbn1cbi8qKlxuICogUmVuZGVycyB0aGlzIGFwcCB1bnVzYWJsZSBhbmQgZnJlZXMgdGhlIHJlc291cmNlcyBvZiBhbGwgYXNzb2NpYXRlZFxuICogc2VydmljZXMuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYGphdmFzY3JpcHRcbiAqIGRlbGV0ZUFwcChhcHApXG4gKiAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICogICAgIGNvbnNvbGUubG9nKFwiQXBwIGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5XCIpO1xuICogICB9KVxuICogICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAqICAgICBjb25zb2xlLmxvZyhcIkVycm9yIGRlbGV0aW5nIGFwcDpcIiwgZXJyb3IpO1xuICogICB9KTtcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZGVsZXRlQXBwKGFwcCkge1xuICAgIGxldCBjbGVhbnVwUHJvdmlkZXJzID0gZmFsc2U7XG4gICAgY29uc3QgbmFtZSA9IGFwcC5uYW1lO1xuICAgIGlmIChfYXBwcy5oYXMobmFtZSkpIHtcbiAgICAgICAgY2xlYW51cFByb3ZpZGVycyA9IHRydWU7XG4gICAgICAgIF9hcHBzLmRlbGV0ZShuYW1lKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoX3NlcnZlckFwcHMuaGFzKG5hbWUpKSB7XG4gICAgICAgIGNvbnN0IGZpcmViYXNlU2VydmVyQXBwID0gYXBwO1xuICAgICAgICBpZiAoZmlyZWJhc2VTZXJ2ZXJBcHAuZGVjUmVmQ291bnQoKSA8PSAwKSB7XG4gICAgICAgICAgICBfc2VydmVyQXBwcy5kZWxldGUobmFtZSk7XG4gICAgICAgICAgICBjbGVhbnVwUHJvdmlkZXJzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2xlYW51cFByb3ZpZGVycykge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChhcHAuY29udGFpbmVyXG4gICAgICAgICAgICAuZ2V0UHJvdmlkZXJzKClcbiAgICAgICAgICAgIC5tYXAocHJvdmlkZXIgPT4gcHJvdmlkZXIuZGVsZXRlKCkpKTtcbiAgICAgICAgYXBwLmlzRGVsZXRlZCA9IHRydWU7XG4gICAgfVxufVxuLyoqXG4gKiBSZWdpc3RlcnMgYSBsaWJyYXJ5J3MgbmFtZSBhbmQgdmVyc2lvbiBmb3IgcGxhdGZvcm0gbG9nZ2luZyBwdXJwb3Nlcy5cbiAqIEBwYXJhbSBsaWJyYXJ5IC0gTmFtZSBvZiAxcCBvciAzcCBsaWJyYXJ5IChlLmcuIGZpcmVzdG9yZSwgYW5ndWxhcmZpcmUpXG4gKiBAcGFyYW0gdmVyc2lvbiAtIEN1cnJlbnQgdmVyc2lvbiBvZiB0aGF0IGxpYnJhcnkuXG4gKiBAcGFyYW0gdmFyaWFudCAtIEJ1bmRsZSB2YXJpYW50LCBlLmcuLCBub2RlLCBybiwgZXRjLlxuICpcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJWZXJzaW9uKGxpYnJhcnlLZXlPck5hbWUsIHZlcnNpb24sIHZhcmlhbnQpIHtcbiAgICAvLyBUT0RPOiBXZSBjYW4gdXNlIHRoaXMgY2hlY2sgdG8gd2hpdGVsaXN0IHN0cmluZ3Mgd2hlbi9pZiB3ZSBzZXQgdXBcbiAgICAvLyBhIGdvb2Qgd2hpdGVsaXN0IHN5c3RlbS5cbiAgICBsZXQgbGlicmFyeSA9IFBMQVRGT1JNX0xPR19TVFJJTkdbbGlicmFyeUtleU9yTmFtZV0gPz8gbGlicmFyeUtleU9yTmFtZTtcbiAgICBpZiAodmFyaWFudCkge1xuICAgICAgICBsaWJyYXJ5ICs9IGAtJHt2YXJpYW50fWA7XG4gICAgfVxuICAgIGNvbnN0IGxpYnJhcnlNaXNtYXRjaCA9IGxpYnJhcnkubWF0Y2goL1xcc3xcXC8vKTtcbiAgICBjb25zdCB2ZXJzaW9uTWlzbWF0Y2ggPSB2ZXJzaW9uLm1hdGNoKC9cXHN8XFwvLyk7XG4gICAgaWYgKGxpYnJhcnlNaXNtYXRjaCB8fCB2ZXJzaW9uTWlzbWF0Y2gpIHtcbiAgICAgICAgY29uc3Qgd2FybmluZyA9IFtcbiAgICAgICAgICAgIGBVbmFibGUgdG8gcmVnaXN0ZXIgbGlicmFyeSBcIiR7bGlicmFyeX1cIiB3aXRoIHZlcnNpb24gXCIke3ZlcnNpb259XCI6YFxuICAgICAgICBdO1xuICAgICAgICBpZiAobGlicmFyeU1pc21hdGNoKSB7XG4gICAgICAgICAgICB3YXJuaW5nLnB1c2goYGxpYnJhcnkgbmFtZSBcIiR7bGlicmFyeX1cIiBjb250YWlucyBpbGxlZ2FsIGNoYXJhY3RlcnMgKHdoaXRlc3BhY2Ugb3IgXCIvXCIpYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpYnJhcnlNaXNtYXRjaCAmJiB2ZXJzaW9uTWlzbWF0Y2gpIHtcbiAgICAgICAgICAgIHdhcm5pbmcucHVzaCgnYW5kJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZlcnNpb25NaXNtYXRjaCkge1xuICAgICAgICAgICAgd2FybmluZy5wdXNoKGB2ZXJzaW9uIG5hbWUgXCIke3ZlcnNpb259XCIgY29udGFpbnMgaWxsZWdhbCBjaGFyYWN0ZXJzICh3aGl0ZXNwYWNlIG9yIFwiL1wiKWApO1xuICAgICAgICB9XG4gICAgICAgIGxvZ2dlci53YXJuKHdhcm5pbmcuam9pbignICcpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBfcmVnaXN0ZXJDb21wb25lbnQobmV3IENvbXBvbmVudChgJHtsaWJyYXJ5fS12ZXJzaW9uYCwgKCkgPT4gKHsgbGlicmFyeSwgdmVyc2lvbiB9KSwgXCJWRVJTSU9OXCIgLyogQ29tcG9uZW50VHlwZS5WRVJTSU9OICovKSk7XG59XG4vKipcbiAqIFNldHMgbG9nIGhhbmRsZXIgZm9yIGFsbCBGaXJlYmFzZSBTREtzLlxuICogQHBhcmFtIGxvZ0NhbGxiYWNrIC0gQW4gb3B0aW9uYWwgY3VzdG9tIGxvZyBoYW5kbGVyIHRoYXQgZXhlY3V0ZXMgdXNlciBjb2RlIHdoZW5ldmVyXG4gKiB0aGUgRmlyZWJhc2UgU0RLIG1ha2VzIGEgbG9nZ2luZyBjYWxsLlxuICpcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gb25Mb2cobG9nQ2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICBpZiAobG9nQ2FsbGJhY2sgIT09IG51bGwgJiYgdHlwZW9mIGxvZ0NhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiaW52YWxpZC1sb2ctYXJndW1lbnRcIiAvKiBBcHBFcnJvci5JTlZBTElEX0xPR19BUkdVTUVOVCAqLyk7XG4gICAgfVxuICAgIHNldFVzZXJMb2dIYW5kbGVyKGxvZ0NhbGxiYWNrLCBvcHRpb25zKTtcbn1cbi8qKlxuICogU2V0cyBsb2cgbGV2ZWwgZm9yIGFsbCBGaXJlYmFzZSBTREtzLlxuICpcbiAqIEFsbCBvZiB0aGUgbG9nIHR5cGVzIGFib3ZlIHRoZSBjdXJyZW50IGxvZyBsZXZlbCBhcmUgY2FwdHVyZWQgKGkuZS4gaWZcbiAqIHlvdSBzZXQgdGhlIGxvZyBsZXZlbCB0byBgaW5mb2AsIGVycm9ycyBhcmUgbG9nZ2VkLCBidXQgYGRlYnVnYCBhbmRcbiAqIGB2ZXJib3NlYCBsb2dzIGFyZSBub3QpLlxuICpcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gc2V0TG9nTGV2ZWwobG9nTGV2ZWwpIHtcbiAgICBzZXRMb2dMZXZlbCQxKGxvZ0xldmVsKTtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmNvbnN0IERCX05BTUUgPSAnZmlyZWJhc2UtaGVhcnRiZWF0LWRhdGFiYXNlJztcbmNvbnN0IERCX1ZFUlNJT04gPSAxO1xuY29uc3QgU1RPUkVfTkFNRSA9ICdmaXJlYmFzZS1oZWFydGJlYXQtc3RvcmUnO1xubGV0IGRiUHJvbWlzZSA9IG51bGw7XG5mdW5jdGlvbiBnZXREYlByb21pc2UoKSB7XG4gICAgaWYgKCFkYlByb21pc2UpIHtcbiAgICAgICAgZGJQcm9taXNlID0gb3BlbkRCKERCX05BTUUsIERCX1ZFUlNJT04sIHtcbiAgICAgICAgICAgIHVwZ3JhZGU6IChkYiwgb2xkVmVyc2lvbikgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IHVzZSAnYnJlYWsnIGluIHRoaXMgc3dpdGNoIHN0YXRlbWVudCwgdGhlIGZhbGwtdGhyb3VnaFxuICAgICAgICAgICAgICAgIC8vIGJlaGF2aW9yIGlzIHdoYXQgd2Ugd2FudCwgYmVjYXVzZSBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgdmVyc2lvbnMgYmV0d2VlblxuICAgICAgICAgICAgICAgIC8vIHRoZSBvbGQgdmVyc2lvbiBhbmQgdGhlIGN1cnJlbnQgdmVyc2lvbiwgd2Ugd2FudCBBTEwgdGhlIG1pZ3JhdGlvbnNcbiAgICAgICAgICAgICAgICAvLyB0aGF0IGNvcnJlc3BvbmQgdG8gdGhvc2UgdmVyc2lvbnMgdG8gcnVuLCBub3Qgb25seSB0aGUgbGFzdCBvbmUuXG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGRlZmF1bHQtY2FzZVxuICAgICAgICAgICAgICAgIHN3aXRjaCAob2xkVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRiLmNyZWF0ZU9iamVjdFN0b3JlKFNUT1JFX05BTUUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkvaU9TIGJyb3dzZXJzIHRocm93IG9jY2FzaW9uYWwgZXhjZXB0aW9ucyBvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRiLmNyZWF0ZU9iamVjdFN0b3JlKCkgdGhhdCBtYXkgYmUgYSBidWcuIEF2b2lkIGJsb2NraW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHJlc3Qgb2YgdGhlIGFwcCBmdW5jdGlvbmFsaXR5LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgdGhyb3cgRVJST1JfRkFDVE9SWS5jcmVhdGUoXCJpZGItb3BlblwiIC8qIEFwcEVycm9yLklEQl9PUEVOICovLCB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWxFcnJvck1lc3NhZ2U6IGUubWVzc2FnZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZGJQcm9taXNlO1xufVxuYXN5bmMgZnVuY3Rpb24gcmVhZEhlYXJ0YmVhdHNGcm9tSW5kZXhlZERCKGFwcCkge1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgZ2V0RGJQcm9taXNlKCk7XG4gICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oU1RPUkVfTkFNRSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHR4Lm9iamVjdFN0b3JlKFNUT1JFX05BTUUpLmdldChjb21wdXRlS2V5KGFwcCkpO1xuICAgICAgICAvLyBXZSBhbHJlYWR5IGhhdmUgdGhlIHZhbHVlIGJ1dCB0eC5kb25lIGNhbiB0aHJvdyxcbiAgICAgICAgLy8gc28gd2UgbmVlZCB0byBhd2FpdCBpdCBoZXJlIHRvIGNhdGNoIGVycm9yc1xuICAgICAgICBhd2FpdCB0eC5kb25lO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIEZpcmViYXNlRXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKGUubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBpZGJHZXRFcnJvciA9IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiaWRiLWdldFwiIC8qIEFwcEVycm9yLklEQl9HRVQgKi8sIHtcbiAgICAgICAgICAgICAgICBvcmlnaW5hbEVycm9yTWVzc2FnZTogZT8ubWVzc2FnZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsb2dnZXIud2FybihpZGJHZXRFcnJvci5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmFzeW5jIGZ1bmN0aW9uIHdyaXRlSGVhcnRiZWF0c1RvSW5kZXhlZERCKGFwcCwgaGVhcnRiZWF0T2JqZWN0KSB7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZGIgPSBhd2FpdCBnZXREYlByb21pc2UoKTtcbiAgICAgICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihTVE9SRV9OQU1FLCAncmVhZHdyaXRlJyk7XG4gICAgICAgIGNvbnN0IG9iamVjdFN0b3JlID0gdHgub2JqZWN0U3RvcmUoU1RPUkVfTkFNRSk7XG4gICAgICAgIGF3YWl0IG9iamVjdFN0b3JlLnB1dChoZWFydGJlYXRPYmplY3QsIGNvbXB1dGVLZXkoYXBwKSk7XG4gICAgICAgIGF3YWl0IHR4LmRvbmU7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChlIGluc3RhbmNlb2YgRmlyZWJhc2VFcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oZS5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGlkYkdldEVycm9yID0gRVJST1JfRkFDVE9SWS5jcmVhdGUoXCJpZGItc2V0XCIgLyogQXBwRXJyb3IuSURCX1dSSVRFICovLCB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWxFcnJvck1lc3NhZ2U6IGU/Lm1lc3NhZ2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oaWRiR2V0RXJyb3IubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBjb21wdXRlS2V5KGFwcCkge1xuICAgIHJldHVybiBgJHthcHAubmFtZX0hJHthcHAub3B0aW9ucy5hcHBJZH1gO1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuY29uc3QgTUFYX0hFQURFUl9CWVRFUyA9IDEwMjQ7XG5jb25zdCBNQVhfTlVNX1NUT1JFRF9IRUFSVEJFQVRTID0gMzA7XG5jbGFzcyBIZWFydGJlYXRTZXJ2aWNlSW1wbCB7XG4gICAgY29uc3RydWN0b3IoY29udGFpbmVyKSB7XG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyO1xuICAgICAgICAvKipcbiAgICAgICAgICogSW4tbWVtb3J5IGNhY2hlIGZvciBoZWFydGJlYXRzLCB1c2VkIGJ5IGdldEhlYXJ0YmVhdHNIZWFkZXIoKSB0byBnZW5lcmF0ZVxuICAgICAgICAgKiB0aGUgaGVhZGVyIHN0cmluZy5cbiAgICAgICAgICogU3RvcmVzIG9uZSByZWNvcmQgcGVyIGRhdGUuIFRoaXMgd2lsbCBiZSBjb25zb2xpZGF0ZWQgaW50byB0aGUgc3RhbmRhcmRcbiAgICAgICAgICogZm9ybWF0IG9mIG9uZSByZWNvcmQgcGVyIHVzZXIgYWdlbnQgc3RyaW5nIGJlZm9yZSBiZWluZyBzZW50IGFzIGEgaGVhZGVyLlxuICAgICAgICAgKiBQb3B1bGF0ZWQgZnJvbSBpbmRleGVkREIgd2hlbiB0aGUgY29udHJvbGxlciBpcyBpbnN0YW50aWF0ZWQgYW5kIHNob3VsZFxuICAgICAgICAgKiBiZSBrZXB0IGluIHN5bmMgd2l0aCBpbmRleGVkREIuXG4gICAgICAgICAqIExlYXZlIHB1YmxpYyBmb3IgZWFzaWVyIHRlc3RpbmcuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9oZWFydGJlYXRzQ2FjaGUgPSBudWxsO1xuICAgICAgICBjb25zdCBhcHAgPSB0aGlzLmNvbnRhaW5lci5nZXRQcm92aWRlcignYXBwJykuZ2V0SW1tZWRpYXRlKCk7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBuZXcgSGVhcnRiZWF0U3RvcmFnZUltcGwoYXBwKTtcbiAgICAgICAgdGhpcy5faGVhcnRiZWF0c0NhY2hlUHJvbWlzZSA9IHRoaXMuX3N0b3JhZ2UucmVhZCgpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2hlYXJ0YmVhdHNDYWNoZSA9IHJlc3VsdDtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdG8gcmVwb3J0IGEgaGVhcnRiZWF0LiBUaGUgZnVuY3Rpb24gd2lsbCBnZW5lcmF0ZVxuICAgICAqIGEgSGVhcnRiZWF0c0J5VXNlckFnZW50IG9iamVjdCwgdXBkYXRlIGhlYXJ0YmVhdHNDYWNoZSwgYW5kIHBlcnNpc3QgaXRcbiAgICAgKiB0byBJbmRleGVkREIuXG4gICAgICogTm90ZSB0aGF0IHdlIG9ubHkgc3RvcmUgb25lIGhlYXJ0YmVhdCBwZXIgZGF5LiBTbyBpZiBhIGhlYXJ0YmVhdCBmb3IgdG9kYXkgaXNcbiAgICAgKiBhbHJlYWR5IGxvZ2dlZCwgc3Vic2VxdWVudCBjYWxscyB0byB0aGlzIGZ1bmN0aW9uIGluIHRoZSBzYW1lIGRheSB3aWxsIGJlIGlnbm9yZWQuXG4gICAgICovXG4gICAgYXN5bmMgdHJpZ2dlckhlYXJ0YmVhdCgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBsYXRmb3JtTG9nZ2VyID0gdGhpcy5jb250YWluZXJcbiAgICAgICAgICAgICAgICAuZ2V0UHJvdmlkZXIoJ3BsYXRmb3JtLWxvZ2dlcicpXG4gICAgICAgICAgICAgICAgLmdldEltbWVkaWF0ZSgpO1xuICAgICAgICAgICAgLy8gVGhpcyBpcyB0aGUgXCJGaXJlYmFzZSB1c2VyIGFnZW50XCIgc3RyaW5nIGZyb20gdGhlIHBsYXRmb3JtIGxvZ2dlclxuICAgICAgICAgICAgLy8gc2VydmljZSwgbm90IHRoZSBicm93c2VyIHVzZXIgYWdlbnQuXG4gICAgICAgICAgICBjb25zdCBhZ2VudCA9IHBsYXRmb3JtTG9nZ2VyLmdldFBsYXRmb3JtSW5mb1N0cmluZygpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IGdldFVUQ0RhdGVTdHJpbmcoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9oZWFydGJlYXRzQ2FjaGU/LmhlYXJ0YmVhdHMgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2hlYXJ0YmVhdHNDYWNoZSA9IGF3YWl0IHRoaXMuX2hlYXJ0YmVhdHNDYWNoZVByb21pc2U7XG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgZmFpbGVkIHRvIGNvbnN0cnVjdCBhIGhlYXJ0YmVhdHMgY2FjaGUsIHRoZW4gcmV0dXJuIGltbWVkaWF0ZWx5LlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9oZWFydGJlYXRzQ2FjaGU/LmhlYXJ0YmVhdHMgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRG8gbm90IHN0b3JlIGEgaGVhcnRiZWF0IGlmIG9uZSBpcyBhbHJlYWR5IHN0b3JlZCBmb3IgdGhpcyBkYXlcbiAgICAgICAgICAgIC8vIG9yIGlmIGEgaGVhZGVyIGhhcyBhbHJlYWR5IGJlZW4gc2VudCB0b2RheS5cbiAgICAgICAgICAgIGlmICh0aGlzLl9oZWFydGJlYXRzQ2FjaGUubGFzdFNlbnRIZWFydGJlYXREYXRlID09PSBkYXRlIHx8XG4gICAgICAgICAgICAgICAgdGhpcy5faGVhcnRiZWF0c0NhY2hlLmhlYXJ0YmVhdHMuc29tZShzaW5nbGVEYXRlSGVhcnRiZWF0ID0+IHNpbmdsZURhdGVIZWFydGJlYXQuZGF0ZSA9PT0gZGF0ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUaGVyZSBpcyBubyBlbnRyeSBmb3IgdGhpcyBkYXRlLiBDcmVhdGUgb25lLlxuICAgICAgICAgICAgICAgIHRoaXMuX2hlYXJ0YmVhdHNDYWNoZS5oZWFydGJlYXRzLnB1c2goeyBkYXRlLCBhZ2VudCB9KTtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgbnVtYmVyIG9mIHN0b3JlZCBoZWFydGJlYXRzIGV4Y2VlZHMgdGhlIG1heGltdW0gbnVtYmVyIG9mIHN0b3JlZCBoZWFydGJlYXRzLCByZW1vdmUgdGhlIGhlYXJ0YmVhdCB3aXRoIHRoZSBlYXJsaWVzdCBkYXRlLlxuICAgICAgICAgICAgICAgIC8vIFNpbmNlIHRoaXMgaXMgZXhlY3V0ZWQgZWFjaCB0aW1lIGEgaGVhcnRiZWF0IGlzIHB1c2hlZCwgdGhlIGxpbWl0IGNhbiBvbmx5IGJlIGV4Y2VlZGVkIGJ5IG9uZSwgc28gb25seSBvbmUgbmVlZHMgdG8gYmUgcmVtb3ZlZC5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5faGVhcnRiZWF0c0NhY2hlLmhlYXJ0YmVhdHMubGVuZ3RoID4gTUFYX05VTV9TVE9SRURfSEVBUlRCRUFUUykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlYXJsaWVzdEhlYXJ0YmVhdElkeCA9IGdldEVhcmxpZXN0SGVhcnRiZWF0SWR4KHRoaXMuX2hlYXJ0YmVhdHNDYWNoZS5oZWFydGJlYXRzKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGVhcnRiZWF0c0NhY2hlLmhlYXJ0YmVhdHMuc3BsaWNlKGVhcmxpZXN0SGVhcnRiZWF0SWR4LCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5vdmVyd3JpdGUodGhpcy5faGVhcnRiZWF0c0NhY2hlKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIGJhc2U2NCBlbmNvZGVkIHN0cmluZyB3aGljaCBjYW4gYmUgYXR0YWNoZWQgdG8gdGhlIGhlYXJ0YmVhdC1zcGVjaWZpYyBoZWFkZXIgZGlyZWN0bHkuXG4gICAgICogSXQgYWxzbyBjbGVhcnMgYWxsIGhlYXJ0YmVhdHMgZnJvbSBtZW1vcnkgYXMgd2VsbCBhcyBpbiBJbmRleGVkREIuXG4gICAgICpcbiAgICAgKiBOT1RFOiBDb25zdW1pbmcgcHJvZHVjdCBTREtzIHNob3VsZCBub3Qgc2VuZCB0aGUgaGVhZGVyIGlmIHRoaXMgbWV0aG9kXG4gICAgICogcmV0dXJucyBhbiBlbXB0eSBzdHJpbmcuXG4gICAgICovXG4gICAgYXN5bmMgZ2V0SGVhcnRiZWF0c0hlYWRlcigpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9oZWFydGJlYXRzQ2FjaGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9oZWFydGJlYXRzQ2FjaGVQcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgaXQncyBzdGlsbCBudWxsIG9yIHRoZSBhcnJheSBpcyBlbXB0eSwgdGhlcmUgaXMgbm8gZGF0YSB0byBzZW5kLlxuICAgICAgICAgICAgaWYgKHRoaXMuX2hlYXJ0YmVhdHNDYWNoZT8uaGVhcnRiZWF0cyA9PSBudWxsIHx8XG4gICAgICAgICAgICAgICAgdGhpcy5faGVhcnRiZWF0c0NhY2hlLmhlYXJ0YmVhdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IGdldFVUQ0RhdGVTdHJpbmcoKTtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgYXMgbWFueSBoZWFydGJlYXRzIGZyb20gdGhlIGNhY2hlIGFzIHdpbGwgZml0IHVuZGVyIHRoZSBzaXplIGxpbWl0LlxuICAgICAgICAgICAgY29uc3QgeyBoZWFydGJlYXRzVG9TZW5kLCB1bnNlbnRFbnRyaWVzIH0gPSBleHRyYWN0SGVhcnRiZWF0c0ZvckhlYWRlcih0aGlzLl9oZWFydGJlYXRzQ2FjaGUuaGVhcnRiZWF0cyk7XG4gICAgICAgICAgICBjb25zdCBoZWFkZXJTdHJpbmcgPSBiYXNlNjR1cmxFbmNvZGVXaXRob3V0UGFkZGluZyhKU09OLnN0cmluZ2lmeSh7IHZlcnNpb246IDIsIGhlYXJ0YmVhdHM6IGhlYXJ0YmVhdHNUb1NlbmQgfSkpO1xuICAgICAgICAgICAgLy8gU3RvcmUgbGFzdCBzZW50IGRhdGUgdG8gcHJldmVudCBhbm90aGVyIGJlaW5nIGxvZ2dlZC9zZW50IGZvciB0aGUgc2FtZSBkYXkuXG4gICAgICAgICAgICB0aGlzLl9oZWFydGJlYXRzQ2FjaGUubGFzdFNlbnRIZWFydGJlYXREYXRlID0gZGF0ZTtcbiAgICAgICAgICAgIGlmICh1bnNlbnRFbnRyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBhbnkgdW5zZW50IGVudHJpZXMgaWYgdGhleSBleGlzdC5cbiAgICAgICAgICAgICAgICB0aGlzLl9oZWFydGJlYXRzQ2FjaGUuaGVhcnRiZWF0cyA9IHVuc2VudEVudHJpZXM7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyBzZWVtcyBtb3JlIGxpa2VseSB0aGFuIGVtcHR5aW5nIHRoZSBhcnJheSAoYmVsb3cpIHRvIGxlYWQgdG8gc29tZSBvZGQgc3RhdGVcbiAgICAgICAgICAgICAgICAvLyBzaW5jZSB0aGUgY2FjaGUgaXNuJ3QgZW1wdHkgYW5kIHRoaXMgd2lsbCBiZSBjYWxsZWQgYWdhaW4gb24gdGhlIG5leHQgcmVxdWVzdCxcbiAgICAgICAgICAgICAgICAvLyBhbmQgaXMgcHJvYmFibHkgc2FmZXN0IGlmIHdlIGF3YWl0IGl0LlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2Uub3ZlcndyaXRlKHRoaXMuX2hlYXJ0YmVhdHNDYWNoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9oZWFydGJlYXRzQ2FjaGUuaGVhcnRiZWF0cyA9IFtdO1xuICAgICAgICAgICAgICAgIC8vIERvIG5vdCB3YWl0IGZvciB0aGlzLCB0byByZWR1Y2UgbGF0ZW5jeS5cbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMuX3N0b3JhZ2Uub3ZlcndyaXRlKHRoaXMuX2hlYXJ0YmVhdHNDYWNoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaGVhZGVyU3RyaW5nO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICBsb2dnZXIud2FybihlKTtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIGdldFVUQ0RhdGVTdHJpbmcoKSB7XG4gICAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xuICAgIC8vIFJldHVybnMgZGF0ZSBmb3JtYXQgJ1lZWVktTU0tREQnXG4gICAgcmV0dXJuIHRvZGF5LnRvSVNPU3RyaW5nKCkuc3Vic3RyaW5nKDAsIDEwKTtcbn1cbmZ1bmN0aW9uIGV4dHJhY3RIZWFydGJlYXRzRm9ySGVhZGVyKGhlYXJ0YmVhdHNDYWNoZSwgbWF4U2l6ZSA9IE1BWF9IRUFERVJfQllURVMpIHtcbiAgICAvLyBIZWFydGJlYXRzIGdyb3VwZWQgYnkgdXNlciBhZ2VudCBpbiB0aGUgc3RhbmRhcmQgZm9ybWF0IHRvIGJlIHNlbnQgaW5cbiAgICAvLyB0aGUgaGVhZGVyLlxuICAgIGNvbnN0IGhlYXJ0YmVhdHNUb1NlbmQgPSBbXTtcbiAgICAvLyBTaW5nbGUgZGF0ZSBmb3JtYXQgaGVhcnRiZWF0cyB0aGF0IGFyZSBub3Qgc2VudC5cbiAgICBsZXQgdW5zZW50RW50cmllcyA9IGhlYXJ0YmVhdHNDYWNoZS5zbGljZSgpO1xuICAgIGZvciAoY29uc3Qgc2luZ2xlRGF0ZUhlYXJ0YmVhdCBvZiBoZWFydGJlYXRzQ2FjaGUpIHtcbiAgICAgICAgLy8gTG9vayBmb3IgYW4gZXhpc3RpbmcgZW50cnkgd2l0aCB0aGUgc2FtZSB1c2VyIGFnZW50LlxuICAgICAgICBjb25zdCBoZWFydGJlYXRFbnRyeSA9IGhlYXJ0YmVhdHNUb1NlbmQuZmluZChoYiA9PiBoYi5hZ2VudCA9PT0gc2luZ2xlRGF0ZUhlYXJ0YmVhdC5hZ2VudCk7XG4gICAgICAgIGlmICghaGVhcnRiZWF0RW50cnkpIHtcbiAgICAgICAgICAgIC8vIElmIG5vIGVudHJ5IGZvciB0aGlzIHVzZXIgYWdlbnQgZXhpc3RzLCBjcmVhdGUgb25lLlxuICAgICAgICAgICAgaGVhcnRiZWF0c1RvU2VuZC5wdXNoKHtcbiAgICAgICAgICAgICAgICBhZ2VudDogc2luZ2xlRGF0ZUhlYXJ0YmVhdC5hZ2VudCxcbiAgICAgICAgICAgICAgICBkYXRlczogW3NpbmdsZURhdGVIZWFydGJlYXQuZGF0ZV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGNvdW50Qnl0ZXMoaGVhcnRiZWF0c1RvU2VuZCkgPiBtYXhTaXplKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGhlYWRlciB3b3VsZCBleGNlZWQgbWF4IHNpemUsIHJlbW92ZSB0aGUgYWRkZWQgaGVhcnRiZWF0XG4gICAgICAgICAgICAgICAgLy8gZW50cnkgYW5kIHN0b3AgYWRkaW5nIHRvIHRoZSBoZWFkZXIuXG4gICAgICAgICAgICAgICAgaGVhcnRiZWF0c1RvU2VuZC5wb3AoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGhlYXJ0YmVhdEVudHJ5LmRhdGVzLnB1c2goc2luZ2xlRGF0ZUhlYXJ0YmVhdC5kYXRlKTtcbiAgICAgICAgICAgIC8vIElmIHRoZSBoZWFkZXIgd291bGQgZXhjZWVkIG1heCBzaXplLCByZW1vdmUgdGhlIGFkZGVkIGRhdGVcbiAgICAgICAgICAgIC8vIGFuZCBzdG9wIGFkZGluZyB0byB0aGUgaGVhZGVyLlxuICAgICAgICAgICAgaWYgKGNvdW50Qnl0ZXMoaGVhcnRiZWF0c1RvU2VuZCkgPiBtYXhTaXplKSB7XG4gICAgICAgICAgICAgICAgaGVhcnRiZWF0RW50cnkuZGF0ZXMucG9wKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gUG9wIHVuc2VudCBlbnRyeSBmcm9tIHF1ZXVlLiAoU2tpcHBlZCBpZiBhZGRpbmcgdGhlIGVudHJ5IGV4Y2VlZGVkXG4gICAgICAgIC8vIHF1b3RhIGFuZCB0aGUgbG9vcCBicmVha3MgZWFybHkuKVxuICAgICAgICB1bnNlbnRFbnRyaWVzID0gdW5zZW50RW50cmllcy5zbGljZSgxKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgaGVhcnRiZWF0c1RvU2VuZCxcbiAgICAgICAgdW5zZW50RW50cmllc1xuICAgIH07XG59XG5jbGFzcyBIZWFydGJlYXRTdG9yYWdlSW1wbCB7XG4gICAgY29uc3RydWN0b3IoYXBwKSB7XG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLl9jYW5Vc2VJbmRleGVkREJQcm9taXNlID0gdGhpcy5ydW5JbmRleGVkREJFbnZpcm9ubWVudENoZWNrKCk7XG4gICAgfVxuICAgIGFzeW5jIHJ1bkluZGV4ZWREQkVudmlyb25tZW50Q2hlY2soKSB7XG4gICAgICAgIGlmICghaXNJbmRleGVkREJBdmFpbGFibGUoKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHZhbGlkYXRlSW5kZXhlZERCT3BlbmFibGUoKVxuICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHRydWUpXG4gICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZWFkIGFsbCBoZWFydGJlYXRzLlxuICAgICAqL1xuICAgIGFzeW5jIHJlYWQoKSB7XG4gICAgICAgIGNvbnN0IGNhblVzZUluZGV4ZWREQiA9IGF3YWl0IHRoaXMuX2NhblVzZUluZGV4ZWREQlByb21pc2U7XG4gICAgICAgIGlmICghY2FuVXNlSW5kZXhlZERCKSB7XG4gICAgICAgICAgICByZXR1cm4geyBoZWFydGJlYXRzOiBbXSB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgaWRiSGVhcnRiZWF0T2JqZWN0ID0gYXdhaXQgcmVhZEhlYXJ0YmVhdHNGcm9tSW5kZXhlZERCKHRoaXMuYXBwKTtcbiAgICAgICAgICAgIGlmIChpZGJIZWFydGJlYXRPYmplY3Q/LmhlYXJ0YmVhdHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaWRiSGVhcnRiZWF0T2JqZWN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgaGVhcnRiZWF0czogW10gfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBvdmVyd3JpdGUgdGhlIHN0b3JhZ2Ugd2l0aCB0aGUgcHJvdmlkZWQgaGVhcnRiZWF0c1xuICAgIGFzeW5jIG92ZXJ3cml0ZShoZWFydGJlYXRzT2JqZWN0KSB7XG4gICAgICAgIGNvbnN0IGNhblVzZUluZGV4ZWREQiA9IGF3YWl0IHRoaXMuX2NhblVzZUluZGV4ZWREQlByb21pc2U7XG4gICAgICAgIGlmICghY2FuVXNlSW5kZXhlZERCKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ0hlYXJ0YmVhdHNPYmplY3QgPSBhd2FpdCB0aGlzLnJlYWQoKTtcbiAgICAgICAgICAgIHJldHVybiB3cml0ZUhlYXJ0YmVhdHNUb0luZGV4ZWREQih0aGlzLmFwcCwge1xuICAgICAgICAgICAgICAgIGxhc3RTZW50SGVhcnRiZWF0RGF0ZTogaGVhcnRiZWF0c09iamVjdC5sYXN0U2VudEhlYXJ0YmVhdERhdGUgPz9cbiAgICAgICAgICAgICAgICAgICAgZXhpc3RpbmdIZWFydGJlYXRzT2JqZWN0Lmxhc3RTZW50SGVhcnRiZWF0RGF0ZSxcbiAgICAgICAgICAgICAgICBoZWFydGJlYXRzOiBoZWFydGJlYXRzT2JqZWN0LmhlYXJ0YmVhdHNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGFkZCBoZWFydGJlYXRzXG4gICAgYXN5bmMgYWRkKGhlYXJ0YmVhdHNPYmplY3QpIHtcbiAgICAgICAgY29uc3QgY2FuVXNlSW5kZXhlZERCID0gYXdhaXQgdGhpcy5fY2FuVXNlSW5kZXhlZERCUHJvbWlzZTtcbiAgICAgICAgaWYgKCFjYW5Vc2VJbmRleGVkREIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nSGVhcnRiZWF0c09iamVjdCA9IGF3YWl0IHRoaXMucmVhZCgpO1xuICAgICAgICAgICAgcmV0dXJuIHdyaXRlSGVhcnRiZWF0c1RvSW5kZXhlZERCKHRoaXMuYXBwLCB7XG4gICAgICAgICAgICAgICAgbGFzdFNlbnRIZWFydGJlYXREYXRlOiBoZWFydGJlYXRzT2JqZWN0Lmxhc3RTZW50SGVhcnRiZWF0RGF0ZSA/P1xuICAgICAgICAgICAgICAgICAgICBleGlzdGluZ0hlYXJ0YmVhdHNPYmplY3QubGFzdFNlbnRIZWFydGJlYXREYXRlLFxuICAgICAgICAgICAgICAgIGhlYXJ0YmVhdHM6IFtcbiAgICAgICAgICAgICAgICAgICAgLi4uZXhpc3RpbmdIZWFydGJlYXRzT2JqZWN0LmhlYXJ0YmVhdHMsXG4gICAgICAgICAgICAgICAgICAgIC4uLmhlYXJ0YmVhdHNPYmplY3QuaGVhcnRiZWF0c1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxufVxuLyoqXG4gKiBDYWxjdWxhdGUgYnl0ZXMgb2YgYSBIZWFydGJlYXRzQnlVc2VyQWdlbnQgYXJyYXkgYWZ0ZXIgYmVpbmcgd3JhcHBlZFxuICogaW4gYSBwbGF0Zm9ybSBsb2dnaW5nIGhlYWRlciBKU09OIG9iamVjdCwgc3RyaW5naWZpZWQsIGFuZCBjb252ZXJ0ZWRcbiAqIHRvIGJhc2UgNjQuXG4gKi9cbmZ1bmN0aW9uIGNvdW50Qnl0ZXMoaGVhcnRiZWF0c0NhY2hlKSB7XG4gICAgLy8gYmFzZTY0IGhhcyBhIHJlc3RyaWN0ZWQgc2V0IG9mIGNoYXJhY3RlcnMsIGFsbCBvZiB3aGljaCBzaG91bGQgYmUgMSBieXRlLlxuICAgIHJldHVybiBiYXNlNjR1cmxFbmNvZGVXaXRob3V0UGFkZGluZyhcbiAgICAvLyBoZWFydGJlYXRzQ2FjaGUgd3JhcHBlciBwcm9wZXJ0aWVzXG4gICAgSlNPTi5zdHJpbmdpZnkoeyB2ZXJzaW9uOiAyLCBoZWFydGJlYXRzOiBoZWFydGJlYXRzQ2FjaGUgfSkpLmxlbmd0aDtcbn1cbi8qKlxuICogUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGhlYXJ0YmVhdCB3aXRoIHRoZSBlYXJsaWVzdCBkYXRlLlxuICogSWYgdGhlIGhlYXJ0YmVhdHMgYXJyYXkgaXMgZW1wdHksIC0xIGlzIHJldHVybmVkLlxuICovXG5mdW5jdGlvbiBnZXRFYXJsaWVzdEhlYXJ0YmVhdElkeChoZWFydGJlYXRzKSB7XG4gICAgaWYgKGhlYXJ0YmVhdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgbGV0IGVhcmxpZXN0SGVhcnRiZWF0SWR4ID0gMDtcbiAgICBsZXQgZWFybGllc3RIZWFydGJlYXREYXRlID0gaGVhcnRiZWF0c1swXS5kYXRlO1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgaGVhcnRiZWF0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaGVhcnRiZWF0c1tpXS5kYXRlIDwgZWFybGllc3RIZWFydGJlYXREYXRlKSB7XG4gICAgICAgICAgICBlYXJsaWVzdEhlYXJ0YmVhdERhdGUgPSBoZWFydGJlYXRzW2ldLmRhdGU7XG4gICAgICAgICAgICBlYXJsaWVzdEhlYXJ0YmVhdElkeCA9IGk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVhcmxpZXN0SGVhcnRiZWF0SWR4O1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJDb3JlQ29tcG9uZW50cyh2YXJpYW50KSB7XG4gICAgX3JlZ2lzdGVyQ29tcG9uZW50KG5ldyBDb21wb25lbnQoJ3BsYXRmb3JtLWxvZ2dlcicsIGNvbnRhaW5lciA9PiBuZXcgUGxhdGZvcm1Mb2dnZXJTZXJ2aWNlSW1wbChjb250YWluZXIpLCBcIlBSSVZBVEVcIiAvKiBDb21wb25lbnRUeXBlLlBSSVZBVEUgKi8pKTtcbiAgICBfcmVnaXN0ZXJDb21wb25lbnQobmV3IENvbXBvbmVudCgnaGVhcnRiZWF0JywgY29udGFpbmVyID0+IG5ldyBIZWFydGJlYXRTZXJ2aWNlSW1wbChjb250YWluZXIpLCBcIlBSSVZBVEVcIiAvKiBDb21wb25lbnRUeXBlLlBSSVZBVEUgKi8pKTtcbiAgICAvLyBSZWdpc3RlciBgYXBwYCBwYWNrYWdlLlxuICAgIHJlZ2lzdGVyVmVyc2lvbihuYW1lJHEsIHZlcnNpb24kMSwgdmFyaWFudCk7XG4gICAgLy8gQlVJTERfVEFSR0VUIHdpbGwgYmUgcmVwbGFjZWQgYnkgdmFsdWVzIGxpa2UgZXNtLCBjanMsIGV0YyBkdXJpbmcgdGhlIGNvbXBpbGF0aW9uXG4gICAgcmVnaXN0ZXJWZXJzaW9uKG5hbWUkcSwgdmVyc2lvbiQxLCAnZXNtMjAyMCcpO1xuICAgIC8vIFJlZ2lzdGVyIHBsYXRmb3JtIFNESyBpZGVudGlmaWVyIChubyB2ZXJzaW9uKS5cbiAgICByZWdpc3RlclZlcnNpb24oJ2ZpcmUtanMnLCAnJyk7XG59XG5cbi8qKlxuICogRmlyZWJhc2UgQXBwXG4gKlxuICogQHJlbWFya3MgVGhpcyBwYWNrYWdlIGNvb3JkaW5hdGVzIHRoZSBjb21tdW5pY2F0aW9uIGJldHdlZW4gdGhlIGRpZmZlcmVudCBGaXJlYmFzZSBjb21wb25lbnRzXG4gKiBAcGFja2FnZURvY3VtZW50YXRpb25cbiAqL1xucmVnaXN0ZXJDb3JlQ29tcG9uZW50cygnJyk7XG5cbmV4cG9ydCB7IFNES19WRVJTSU9OLCBERUZBVUxUX0VOVFJZX05BTUUgYXMgX0RFRkFVTFRfRU5UUllfTkFNRSwgX2FkZENvbXBvbmVudCwgX2FkZE9yT3ZlcndyaXRlQ29tcG9uZW50LCBfYXBwcywgX2NsZWFyQ29tcG9uZW50cywgX2NvbXBvbmVudHMsIF9nZXRQcm92aWRlciwgX2lzRmlyZWJhc2VBcHAsIF9pc0ZpcmViYXNlU2VydmVyQXBwLCBfaXNGaXJlYmFzZVNlcnZlckFwcFNldHRpbmdzLCBfcmVnaXN0ZXJDb21wb25lbnQsIF9yZW1vdmVTZXJ2aWNlSW5zdGFuY2UsIF9zZXJ2ZXJBcHBzLCBkZWxldGVBcHAsIGdldEFwcCwgZ2V0QXBwcywgaW5pdGlhbGl6ZUFwcCwgaW5pdGlhbGl6ZVNlcnZlckFwcCwgb25Mb2csIHJlZ2lzdGVyVmVyc2lvbiwgc2V0TG9nTGV2ZWwgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmVzbS5qcy5tYXBcbiIsImltcG9ydCB7IHJlZ2lzdGVyVmVyc2lvbiB9IGZyb20gJ0BmaXJlYmFzZS9hcHAnO1xuZXhwb3J0ICogZnJvbSAnQGZpcmViYXNlL2FwcCc7XG5cbnZhciBuYW1lID0gXCJmaXJlYmFzZVwiO1xudmFyIHZlcnNpb24gPSBcIjEyLjEwLjBcIjtcblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbnJlZ2lzdGVyVmVyc2lvbihuYW1lLCB2ZXJzaW9uLCAnYXBwJyk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5lc20uanMubWFwXG4iLCJpbXBvcnQgeyBfZ2V0UHJvdmlkZXIsIGdldEFwcCwgX3JlZ2lzdGVyQ29tcG9uZW50LCByZWdpc3RlclZlcnNpb24gfSBmcm9tICdAZmlyZWJhc2UvYXBwJztcbmltcG9ydCB7IENvbXBvbmVudCB9IGZyb20gJ0BmaXJlYmFzZS9jb21wb25lbnQnO1xuaW1wb3J0IHsgRXJyb3JGYWN0b3J5LCBGaXJlYmFzZUVycm9yIH0gZnJvbSAnQGZpcmViYXNlL3V0aWwnO1xuaW1wb3J0IHsgb3BlbkRCIH0gZnJvbSAnaWRiJztcblxuY29uc3QgbmFtZSA9IFwiQGZpcmViYXNlL2luc3RhbGxhdGlvbnNcIjtcbmNvbnN0IHZlcnNpb24gPSBcIjAuNi4yMFwiO1xuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuY29uc3QgUEVORElOR19USU1FT1VUX01TID0gMTAwMDA7XG5jb25zdCBQQUNLQUdFX1ZFUlNJT04gPSBgdzoke3ZlcnNpb259YDtcbmNvbnN0IElOVEVSTkFMX0FVVEhfVkVSU0lPTiA9ICdGSVNfdjInO1xuY29uc3QgSU5TVEFMTEFUSU9OU19BUElfVVJMID0gJ2h0dHBzOi8vZmlyZWJhc2VpbnN0YWxsYXRpb25zLmdvb2dsZWFwaXMuY29tL3YxJztcbmNvbnN0IFRPS0VOX0VYUElSQVRJT05fQlVGRkVSID0gNjAgKiA2MCAqIDEwMDA7IC8vIE9uZSBob3VyXG5jb25zdCBTRVJWSUNFID0gJ2luc3RhbGxhdGlvbnMnO1xuY29uc3QgU0VSVklDRV9OQU1FID0gJ0luc3RhbGxhdGlvbnMnO1xuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuY29uc3QgRVJST1JfREVTQ1JJUFRJT05fTUFQID0ge1xuICAgIFtcIm1pc3NpbmctYXBwLWNvbmZpZy12YWx1ZXNcIiAvKiBFcnJvckNvZGUuTUlTU0lOR19BUFBfQ09ORklHX1ZBTFVFUyAqL106ICdNaXNzaW5nIEFwcCBjb25maWd1cmF0aW9uIHZhbHVlOiBcInskdmFsdWVOYW1lfVwiJyxcbiAgICBbXCJub3QtcmVnaXN0ZXJlZFwiIC8qIEVycm9yQ29kZS5OT1RfUkVHSVNURVJFRCAqL106ICdGaXJlYmFzZSBJbnN0YWxsYXRpb24gaXMgbm90IHJlZ2lzdGVyZWQuJyxcbiAgICBbXCJpbnN0YWxsYXRpb24tbm90LWZvdW5kXCIgLyogRXJyb3JDb2RlLklOU1RBTExBVElPTl9OT1RfRk9VTkQgKi9dOiAnRmlyZWJhc2UgSW5zdGFsbGF0aW9uIG5vdCBmb3VuZC4nLFxuICAgIFtcInJlcXVlc3QtZmFpbGVkXCIgLyogRXJyb3JDb2RlLlJFUVVFU1RfRkFJTEVEICovXTogJ3skcmVxdWVzdE5hbWV9IHJlcXVlc3QgZmFpbGVkIHdpdGggZXJyb3IgXCJ7JHNlcnZlckNvZGV9IHskc2VydmVyU3RhdHVzfTogeyRzZXJ2ZXJNZXNzYWdlfVwiJyxcbiAgICBbXCJhcHAtb2ZmbGluZVwiIC8qIEVycm9yQ29kZS5BUFBfT0ZGTElORSAqL106ICdDb3VsZCBub3QgcHJvY2VzcyByZXF1ZXN0LiBBcHBsaWNhdGlvbiBvZmZsaW5lLicsXG4gICAgW1wiZGVsZXRlLXBlbmRpbmctcmVnaXN0cmF0aW9uXCIgLyogRXJyb3JDb2RlLkRFTEVURV9QRU5ESU5HX1JFR0lTVFJBVElPTiAqL106IFwiQ2FuJ3QgZGVsZXRlIGluc3RhbGxhdGlvbiB3aGlsZSB0aGVyZSBpcyBhIHBlbmRpbmcgcmVnaXN0cmF0aW9uIHJlcXVlc3QuXCJcbn07XG5jb25zdCBFUlJPUl9GQUNUT1JZID0gbmV3IEVycm9yRmFjdG9yeShTRVJWSUNFLCBTRVJWSUNFX05BTUUsIEVSUk9SX0RFU0NSSVBUSU9OX01BUCk7XG4vKiogUmV0dXJucyB0cnVlIGlmIGVycm9yIGlzIGEgRmlyZWJhc2VFcnJvciB0aGF0IGlzIGJhc2VkIG9uIGFuIGVycm9yIGZyb20gdGhlIHNlcnZlci4gKi9cbmZ1bmN0aW9uIGlzU2VydmVyRXJyb3IoZXJyb3IpIHtcbiAgICByZXR1cm4gKGVycm9yIGluc3RhbmNlb2YgRmlyZWJhc2VFcnJvciAmJlxuICAgICAgICBlcnJvci5jb2RlLmluY2x1ZGVzKFwicmVxdWVzdC1mYWlsZWRcIiAvKiBFcnJvckNvZGUuUkVRVUVTVF9GQUlMRUQgKi8pKTtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmZ1bmN0aW9uIGdldEluc3RhbGxhdGlvbnNFbmRwb2ludCh7IHByb2plY3RJZCB9KSB7XG4gICAgcmV0dXJuIGAke0lOU1RBTExBVElPTlNfQVBJX1VSTH0vcHJvamVjdHMvJHtwcm9qZWN0SWR9L2luc3RhbGxhdGlvbnNgO1xufVxuZnVuY3Rpb24gZXh0cmFjdEF1dGhUb2tlbkluZm9Gcm9tUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0b2tlbjogcmVzcG9uc2UudG9rZW4sXG4gICAgICAgIHJlcXVlc3RTdGF0dXM6IDIgLyogUmVxdWVzdFN0YXR1cy5DT01QTEVURUQgKi8sXG4gICAgICAgIGV4cGlyZXNJbjogZ2V0RXhwaXJlc0luRnJvbVJlc3BvbnNlRXhwaXJlc0luKHJlc3BvbnNlLmV4cGlyZXNJbiksXG4gICAgICAgIGNyZWF0aW9uVGltZTogRGF0ZS5ub3coKVxuICAgIH07XG59XG5hc3luYyBmdW5jdGlvbiBnZXRFcnJvckZyb21SZXNwb25zZShyZXF1ZXN0TmFtZSwgcmVzcG9uc2UpIHtcbiAgICBjb25zdCByZXNwb25zZUpzb24gPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgY29uc3QgZXJyb3JEYXRhID0gcmVzcG9uc2VKc29uLmVycm9yO1xuICAgIHJldHVybiBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcInJlcXVlc3QtZmFpbGVkXCIgLyogRXJyb3JDb2RlLlJFUVVFU1RfRkFJTEVEICovLCB7XG4gICAgICAgIHJlcXVlc3ROYW1lLFxuICAgICAgICBzZXJ2ZXJDb2RlOiBlcnJvckRhdGEuY29kZSxcbiAgICAgICAgc2VydmVyTWVzc2FnZTogZXJyb3JEYXRhLm1lc3NhZ2UsXG4gICAgICAgIHNlcnZlclN0YXR1czogZXJyb3JEYXRhLnN0YXR1c1xuICAgIH0pO1xufVxuZnVuY3Rpb24gZ2V0SGVhZGVycyh7IGFwaUtleSB9KSB7XG4gICAgcmV0dXJuIG5ldyBIZWFkZXJzKHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgQWNjZXB0OiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICd4LWdvb2ctYXBpLWtleSc6IGFwaUtleVxuICAgIH0pO1xufVxuZnVuY3Rpb24gZ2V0SGVhZGVyc1dpdGhBdXRoKGFwcENvbmZpZywgeyByZWZyZXNoVG9rZW4gfSkge1xuICAgIGNvbnN0IGhlYWRlcnMgPSBnZXRIZWFkZXJzKGFwcENvbmZpZyk7XG4gICAgaGVhZGVycy5hcHBlbmQoJ0F1dGhvcml6YXRpb24nLCBnZXRBdXRob3JpemF0aW9uSGVhZGVyKHJlZnJlc2hUb2tlbikpO1xuICAgIHJldHVybiBoZWFkZXJzO1xufVxuLyoqXG4gKiBDYWxscyB0aGUgcGFzc2VkIGluIGZldGNoIHdyYXBwZXIgYW5kIHJldHVybnMgdGhlIHJlc3BvbnNlLlxuICogSWYgdGhlIHJldHVybmVkIHJlc3BvbnNlIGhhcyBhIHN0YXR1cyBvZiA1eHgsIHJlLXJ1bnMgdGhlIGZ1bmN0aW9uIG9uY2UgYW5kXG4gKiByZXR1cm5zIHRoZSByZXNwb25zZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmV0cnlJZlNlcnZlckVycm9yKGZuKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZm4oKTtcbiAgICBpZiAocmVzdWx0LnN0YXR1cyA+PSA1MDAgJiYgcmVzdWx0LnN0YXR1cyA8IDYwMCkge1xuICAgICAgICAvLyBJbnRlcm5hbCBTZXJ2ZXIgRXJyb3IuIFJldHJ5IHJlcXVlc3QuXG4gICAgICAgIHJldHVybiBmbigpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gZ2V0RXhwaXJlc0luRnJvbVJlc3BvbnNlRXhwaXJlc0luKHJlc3BvbnNlRXhwaXJlc0luKSB7XG4gICAgLy8gVGhpcyB3b3JrcyBiZWNhdXNlIHRoZSBzZXJ2ZXIgd2lsbCBuZXZlciByZXNwb25kIHdpdGggZnJhY3Rpb25zIG9mIGEgc2Vjb25kLlxuICAgIHJldHVybiBOdW1iZXIocmVzcG9uc2VFeHBpcmVzSW4ucmVwbGFjZSgncycsICcwMDAnKSk7XG59XG5mdW5jdGlvbiBnZXRBdXRob3JpemF0aW9uSGVhZGVyKHJlZnJlc2hUb2tlbikge1xuICAgIHJldHVybiBgJHtJTlRFUk5BTF9BVVRIX1ZFUlNJT059ICR7cmVmcmVzaFRva2VufWA7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVJbnN0YWxsYXRpb25SZXF1ZXN0KHsgYXBwQ29uZmlnLCBoZWFydGJlYXRTZXJ2aWNlUHJvdmlkZXIgfSwgeyBmaWQgfSkge1xuICAgIGNvbnN0IGVuZHBvaW50ID0gZ2V0SW5zdGFsbGF0aW9uc0VuZHBvaW50KGFwcENvbmZpZyk7XG4gICAgY29uc3QgaGVhZGVycyA9IGdldEhlYWRlcnMoYXBwQ29uZmlnKTtcbiAgICAvLyBJZiBoZWFydGJlYXQgc2VydmljZSBleGlzdHMsIGFkZCB0aGUgaGVhcnRiZWF0IHN0cmluZyB0byB0aGUgaGVhZGVyLlxuICAgIGNvbnN0IGhlYXJ0YmVhdFNlcnZpY2UgPSBoZWFydGJlYXRTZXJ2aWNlUHJvdmlkZXIuZ2V0SW1tZWRpYXRlKHtcbiAgICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9KTtcbiAgICBpZiAoaGVhcnRiZWF0U2VydmljZSkge1xuICAgICAgICBjb25zdCBoZWFydGJlYXRzSGVhZGVyID0gYXdhaXQgaGVhcnRiZWF0U2VydmljZS5nZXRIZWFydGJlYXRzSGVhZGVyKCk7XG4gICAgICAgIGlmIChoZWFydGJlYXRzSGVhZGVyKSB7XG4gICAgICAgICAgICBoZWFkZXJzLmFwcGVuZCgneC1maXJlYmFzZS1jbGllbnQnLCBoZWFydGJlYXRzSGVhZGVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBib2R5ID0ge1xuICAgICAgICBmaWQsXG4gICAgICAgIGF1dGhWZXJzaW9uOiBJTlRFUk5BTF9BVVRIX1ZFUlNJT04sXG4gICAgICAgIGFwcElkOiBhcHBDb25maWcuYXBwSWQsXG4gICAgICAgIHNka1ZlcnNpb246IFBBQ0tBR0VfVkVSU0lPTlxuICAgIH07XG4gICAgY29uc3QgcmVxdWVzdCA9IHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpXG4gICAgfTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJldHJ5SWZTZXJ2ZXJFcnJvcigoKSA9PiBmZXRjaChlbmRwb2ludCwgcmVxdWVzdCkpO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgICBjb25zdCByZXNwb25zZVZhbHVlID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICBjb25zdCByZWdpc3RlcmVkSW5zdGFsbGF0aW9uRW50cnkgPSB7XG4gICAgICAgICAgICBmaWQ6IHJlc3BvbnNlVmFsdWUuZmlkIHx8IGZpZCxcbiAgICAgICAgICAgIHJlZ2lzdHJhdGlvblN0YXR1czogMiAvKiBSZXF1ZXN0U3RhdHVzLkNPTVBMRVRFRCAqLyxcbiAgICAgICAgICAgIHJlZnJlc2hUb2tlbjogcmVzcG9uc2VWYWx1ZS5yZWZyZXNoVG9rZW4sXG4gICAgICAgICAgICBhdXRoVG9rZW46IGV4dHJhY3RBdXRoVG9rZW5JbmZvRnJvbVJlc3BvbnNlKHJlc3BvbnNlVmFsdWUuYXV0aFRva2VuKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcmVnaXN0ZXJlZEluc3RhbGxhdGlvbkVudHJ5O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhyb3cgYXdhaXQgZ2V0RXJyb3JGcm9tUmVzcG9uc2UoJ0NyZWF0ZSBJbnN0YWxsYXRpb24nLCByZXNwb25zZSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqIFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgYWZ0ZXIgZ2l2ZW4gdGltZSBwYXNzZXMuICovXG5mdW5jdGlvbiBzbGVlcChtcykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgc2V0VGltZW91dChyZXNvbHZlLCBtcyk7XG4gICAgfSk7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5mdW5jdGlvbiBidWZmZXJUb0Jhc2U2NFVybFNhZmUoYXJyYXkpIHtcbiAgICBjb25zdCBiNjQgPSBidG9hKFN0cmluZy5mcm9tQ2hhckNvZGUoLi4uYXJyYXkpKTtcbiAgICByZXR1cm4gYjY0LnJlcGxhY2UoL1xcKy9nLCAnLScpLnJlcGxhY2UoL1xcLy9nLCAnXycpO1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuY29uc3QgVkFMSURfRklEX1BBVFRFUk4gPSAvXltjZGVmXVtcXHctXXsyMX0kLztcbmNvbnN0IElOVkFMSURfRklEID0gJyc7XG4vKipcbiAqIEdlbmVyYXRlcyBhIG5ldyBGSUQgdXNpbmcgcmFuZG9tIHZhbHVlcyBmcm9tIFdlYiBDcnlwdG8gQVBJLlxuICogUmV0dXJucyBhbiBlbXB0eSBzdHJpbmcgaWYgRklEIGdlbmVyYXRpb24gZmFpbHMgZm9yIGFueSByZWFzb24uXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlRmlkKCkge1xuICAgIHRyeSB7XG4gICAgICAgIC8vIEEgdmFsaWQgRklEIGhhcyBleGFjdGx5IDIyIGJhc2U2NCBjaGFyYWN0ZXJzLCB3aGljaCBpcyAxMzIgYml0cywgb3IgMTYuNVxuICAgICAgICAvLyBieXRlcy4gb3VyIGltcGxlbWVudGF0aW9uIGdlbmVyYXRlcyBhIDE3IGJ5dGUgYXJyYXkgaW5zdGVhZC5cbiAgICAgICAgY29uc3QgZmlkQnl0ZUFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoMTcpO1xuICAgICAgICBjb25zdCBjcnlwdG8gPSBzZWxmLmNyeXB0byB8fCBzZWxmLm1zQ3J5cHRvO1xuICAgICAgICBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKGZpZEJ5dGVBcnJheSk7XG4gICAgICAgIC8vIFJlcGxhY2UgdGhlIGZpcnN0IDQgcmFuZG9tIGJpdHMgd2l0aCB0aGUgY29uc3RhbnQgRklEIGhlYWRlciBvZiAwYjAxMTEuXG4gICAgICAgIGZpZEJ5dGVBcnJheVswXSA9IDBiMDExMTAwMDAgKyAoZmlkQnl0ZUFycmF5WzBdICUgMGIwMDAxMDAwMCk7XG4gICAgICAgIGNvbnN0IGZpZCA9IGVuY29kZShmaWRCeXRlQXJyYXkpO1xuICAgICAgICByZXR1cm4gVkFMSURfRklEX1BBVFRFUk4udGVzdChmaWQpID8gZmlkIDogSU5WQUxJRF9GSUQ7XG4gICAgfVxuICAgIGNhdGNoIHtcbiAgICAgICAgLy8gRklEIGdlbmVyYXRpb24gZXJyb3JlZFxuICAgICAgICByZXR1cm4gSU5WQUxJRF9GSUQ7XG4gICAgfVxufVxuLyoqIENvbnZlcnRzIGEgRklEIFVpbnQ4QXJyYXkgdG8gYSBiYXNlNjQgc3RyaW5nIHJlcHJlc2VudGF0aW9uLiAqL1xuZnVuY3Rpb24gZW5jb2RlKGZpZEJ5dGVBcnJheSkge1xuICAgIGNvbnN0IGI2NFN0cmluZyA9IGJ1ZmZlclRvQmFzZTY0VXJsU2FmZShmaWRCeXRlQXJyYXkpO1xuICAgIC8vIFJlbW92ZSB0aGUgMjNyZCBjaGFyYWN0ZXIgdGhhdCB3YXMgYWRkZWQgYmVjYXVzZSBvZiB0aGUgZXh0cmEgNCBiaXRzIGF0IHRoZVxuICAgIC8vIGVuZCBvZiBvdXIgMTcgYnl0ZSBhcnJheSwgYW5kIHRoZSAnPScgcGFkZGluZy5cbiAgICByZXR1cm4gYjY0U3RyaW5nLnN1YnN0cigwLCAyMik7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKiogUmV0dXJucyBhIHN0cmluZyBrZXkgdGhhdCBjYW4gYmUgdXNlZCB0byBpZGVudGlmeSB0aGUgYXBwLiAqL1xuZnVuY3Rpb24gZ2V0S2V5KGFwcENvbmZpZykge1xuICAgIHJldHVybiBgJHthcHBDb25maWcuYXBwTmFtZX0hJHthcHBDb25maWcuYXBwSWR9YDtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmNvbnN0IGZpZENoYW5nZUNhbGxiYWNrcyA9IG5ldyBNYXAoKTtcbi8qKlxuICogQ2FsbHMgdGhlIG9uSWRDaGFuZ2UgY2FsbGJhY2tzIHdpdGggdGhlIG5ldyBGSUQgdmFsdWUsIGFuZCBicm9hZGNhc3RzIHRoZVxuICogY2hhbmdlIHRvIG90aGVyIHRhYnMuXG4gKi9cbmZ1bmN0aW9uIGZpZENoYW5nZWQoYXBwQ29uZmlnLCBmaWQpIHtcbiAgICBjb25zdCBrZXkgPSBnZXRLZXkoYXBwQ29uZmlnKTtcbiAgICBjYWxsRmlkQ2hhbmdlQ2FsbGJhY2tzKGtleSwgZmlkKTtcbiAgICBicm9hZGNhc3RGaWRDaGFuZ2Uoa2V5LCBmaWQpO1xufVxuZnVuY3Rpb24gYWRkQ2FsbGJhY2soYXBwQ29uZmlnLCBjYWxsYmFjaykge1xuICAgIC8vIE9wZW4gdGhlIGJyb2FkY2FzdCBjaGFubmVsIGlmIGl0J3Mgbm90IGFscmVhZHkgb3BlbixcbiAgICAvLyB0byBiZSBhYmxlIHRvIGxpc3RlbiB0byBjaGFuZ2UgZXZlbnRzIGZyb20gb3RoZXIgdGFicy5cbiAgICBnZXRCcm9hZGNhc3RDaGFubmVsKCk7XG4gICAgY29uc3Qga2V5ID0gZ2V0S2V5KGFwcENvbmZpZyk7XG4gICAgbGV0IGNhbGxiYWNrU2V0ID0gZmlkQ2hhbmdlQ2FsbGJhY2tzLmdldChrZXkpO1xuICAgIGlmICghY2FsbGJhY2tTZXQpIHtcbiAgICAgICAgY2FsbGJhY2tTZXQgPSBuZXcgU2V0KCk7XG4gICAgICAgIGZpZENoYW5nZUNhbGxiYWNrcy5zZXQoa2V5LCBjYWxsYmFja1NldCk7XG4gICAgfVxuICAgIGNhbGxiYWNrU2V0LmFkZChjYWxsYmFjayk7XG59XG5mdW5jdGlvbiByZW1vdmVDYWxsYmFjayhhcHBDb25maWcsIGNhbGxiYWNrKSB7XG4gICAgY29uc3Qga2V5ID0gZ2V0S2V5KGFwcENvbmZpZyk7XG4gICAgY29uc3QgY2FsbGJhY2tTZXQgPSBmaWRDaGFuZ2VDYWxsYmFja3MuZ2V0KGtleSk7XG4gICAgaWYgKCFjYWxsYmFja1NldCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNhbGxiYWNrU2V0LmRlbGV0ZShjYWxsYmFjayk7XG4gICAgaWYgKGNhbGxiYWNrU2V0LnNpemUgPT09IDApIHtcbiAgICAgICAgZmlkQ2hhbmdlQ2FsbGJhY2tzLmRlbGV0ZShrZXkpO1xuICAgIH1cbiAgICAvLyBDbG9zZSBicm9hZGNhc3QgY2hhbm5lbCBpZiB0aGVyZSBhcmUgbm8gbW9yZSBjYWxsYmFja3MuXG4gICAgY2xvc2VCcm9hZGNhc3RDaGFubmVsKCk7XG59XG5mdW5jdGlvbiBjYWxsRmlkQ2hhbmdlQ2FsbGJhY2tzKGtleSwgZmlkKSB7XG4gICAgY29uc3QgY2FsbGJhY2tzID0gZmlkQ2hhbmdlQ2FsbGJhY2tzLmdldChrZXkpO1xuICAgIGlmICghY2FsbGJhY2tzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjYWxsYmFjayBvZiBjYWxsYmFja3MpIHtcbiAgICAgICAgY2FsbGJhY2soZmlkKTtcbiAgICB9XG59XG5mdW5jdGlvbiBicm9hZGNhc3RGaWRDaGFuZ2Uoa2V5LCBmaWQpIHtcbiAgICBjb25zdCBjaGFubmVsID0gZ2V0QnJvYWRjYXN0Q2hhbm5lbCgpO1xuICAgIGlmIChjaGFubmVsKSB7XG4gICAgICAgIGNoYW5uZWwucG9zdE1lc3NhZ2UoeyBrZXksIGZpZCB9KTtcbiAgICB9XG4gICAgY2xvc2VCcm9hZGNhc3RDaGFubmVsKCk7XG59XG5sZXQgYnJvYWRjYXN0Q2hhbm5lbCA9IG51bGw7XG4vKiogT3BlbnMgYW5kIHJldHVybnMgYSBCcm9hZGNhc3RDaGFubmVsIGlmIGl0IGlzIHN1cHBvcnRlZCBieSB0aGUgYnJvd3Nlci4gKi9cbmZ1bmN0aW9uIGdldEJyb2FkY2FzdENoYW5uZWwoKSB7XG4gICAgaWYgKCFicm9hZGNhc3RDaGFubmVsICYmICdCcm9hZGNhc3RDaGFubmVsJyBpbiBzZWxmKSB7XG4gICAgICAgIGJyb2FkY2FzdENoYW5uZWwgPSBuZXcgQnJvYWRjYXN0Q2hhbm5lbCgnW0ZpcmViYXNlXSBGSUQgQ2hhbmdlJyk7XG4gICAgICAgIGJyb2FkY2FzdENoYW5uZWwub25tZXNzYWdlID0gZSA9PiB7XG4gICAgICAgICAgICBjYWxsRmlkQ2hhbmdlQ2FsbGJhY2tzKGUuZGF0YS5rZXksIGUuZGF0YS5maWQpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gYnJvYWRjYXN0Q2hhbm5lbDtcbn1cbmZ1bmN0aW9uIGNsb3NlQnJvYWRjYXN0Q2hhbm5lbCgpIHtcbiAgICBpZiAoZmlkQ2hhbmdlQ2FsbGJhY2tzLnNpemUgPT09IDAgJiYgYnJvYWRjYXN0Q2hhbm5lbCkge1xuICAgICAgICBicm9hZGNhc3RDaGFubmVsLmNsb3NlKCk7XG4gICAgICAgIGJyb2FkY2FzdENoYW5uZWwgPSBudWxsO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmNvbnN0IERBVEFCQVNFX05BTUUgPSAnZmlyZWJhc2UtaW5zdGFsbGF0aW9ucy1kYXRhYmFzZSc7XG5jb25zdCBEQVRBQkFTRV9WRVJTSU9OID0gMTtcbmNvbnN0IE9CSkVDVF9TVE9SRV9OQU1FID0gJ2ZpcmViYXNlLWluc3RhbGxhdGlvbnMtc3RvcmUnO1xubGV0IGRiUHJvbWlzZSA9IG51bGw7XG5mdW5jdGlvbiBnZXREYlByb21pc2UoKSB7XG4gICAgaWYgKCFkYlByb21pc2UpIHtcbiAgICAgICAgZGJQcm9taXNlID0gb3BlbkRCKERBVEFCQVNFX05BTUUsIERBVEFCQVNFX1ZFUlNJT04sIHtcbiAgICAgICAgICAgIHVwZ3JhZGU6IChkYiwgb2xkVmVyc2lvbikgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IHVzZSAnYnJlYWsnIGluIHRoaXMgc3dpdGNoIHN0YXRlbWVudCwgdGhlIGZhbGwtdGhyb3VnaFxuICAgICAgICAgICAgICAgIC8vIGJlaGF2aW9yIGlzIHdoYXQgd2Ugd2FudCwgYmVjYXVzZSBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgdmVyc2lvbnMgYmV0d2VlblxuICAgICAgICAgICAgICAgIC8vIHRoZSBvbGQgdmVyc2lvbiBhbmQgdGhlIGN1cnJlbnQgdmVyc2lvbiwgd2Ugd2FudCBBTEwgdGhlIG1pZ3JhdGlvbnNcbiAgICAgICAgICAgICAgICAvLyB0aGF0IGNvcnJlc3BvbmQgdG8gdGhvc2UgdmVyc2lvbnMgdG8gcnVuLCBub3Qgb25seSB0aGUgbGFzdCBvbmUuXG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGRlZmF1bHQtY2FzZVxuICAgICAgICAgICAgICAgIHN3aXRjaCAob2xkVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgICAgICAgICBkYi5jcmVhdGVPYmplY3RTdG9yZShPQkpFQ1RfU1RPUkVfTkFNRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGRiUHJvbWlzZTtcbn1cbi8qKiBBc3NpZ25zIG9yIG92ZXJ3cml0ZXMgdGhlIHJlY29yZCBmb3IgdGhlIGdpdmVuIGtleSB3aXRoIHRoZSBnaXZlbiB2YWx1ZS4gKi9cbmFzeW5jIGZ1bmN0aW9uIHNldChhcHBDb25maWcsIHZhbHVlKSB7XG4gICAgY29uc3Qga2V5ID0gZ2V0S2V5KGFwcENvbmZpZyk7XG4gICAgY29uc3QgZGIgPSBhd2FpdCBnZXREYlByb21pc2UoKTtcbiAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKE9CSkVDVF9TVE9SRV9OQU1FLCAncmVhZHdyaXRlJyk7XG4gICAgY29uc3Qgb2JqZWN0U3RvcmUgPSB0eC5vYmplY3RTdG9yZShPQkpFQ1RfU1RPUkVfTkFNRSk7XG4gICAgY29uc3Qgb2xkVmFsdWUgPSAoYXdhaXQgb2JqZWN0U3RvcmUuZ2V0KGtleSkpO1xuICAgIGF3YWl0IG9iamVjdFN0b3JlLnB1dCh2YWx1ZSwga2V5KTtcbiAgICBhd2FpdCB0eC5kb25lO1xuICAgIGlmICghb2xkVmFsdWUgfHwgb2xkVmFsdWUuZmlkICE9PSB2YWx1ZS5maWQpIHtcbiAgICAgICAgZmlkQ2hhbmdlZChhcHBDb25maWcsIHZhbHVlLmZpZCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbn1cbi8qKiBSZW1vdmVzIHJlY29yZChzKSBmcm9tIHRoZSBvYmplY3RTdG9yZSB0aGF0IG1hdGNoIHRoZSBnaXZlbiBrZXkuICovXG5hc3luYyBmdW5jdGlvbiByZW1vdmUoYXBwQ29uZmlnKSB7XG4gICAgY29uc3Qga2V5ID0gZ2V0S2V5KGFwcENvbmZpZyk7XG4gICAgY29uc3QgZGIgPSBhd2FpdCBnZXREYlByb21pc2UoKTtcbiAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKE9CSkVDVF9TVE9SRV9OQU1FLCAncmVhZHdyaXRlJyk7XG4gICAgYXdhaXQgdHgub2JqZWN0U3RvcmUoT0JKRUNUX1NUT1JFX05BTUUpLmRlbGV0ZShrZXkpO1xuICAgIGF3YWl0IHR4LmRvbmU7XG59XG4vKipcbiAqIEF0b21pY2FsbHkgdXBkYXRlcyBhIHJlY29yZCB3aXRoIHRoZSByZXN1bHQgb2YgdXBkYXRlRm4sIHdoaWNoIGdldHNcbiAqIGNhbGxlZCB3aXRoIHRoZSBjdXJyZW50IHZhbHVlLiBJZiBuZXdWYWx1ZSBpcyB1bmRlZmluZWQsIHRoZSByZWNvcmQgaXNcbiAqIGRlbGV0ZWQgaW5zdGVhZC5cbiAqIEByZXR1cm4gVXBkYXRlZCB2YWx1ZVxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGUoYXBwQ29uZmlnLCB1cGRhdGVGbikge1xuICAgIGNvbnN0IGtleSA9IGdldEtleShhcHBDb25maWcpO1xuICAgIGNvbnN0IGRiID0gYXdhaXQgZ2V0RGJQcm9taXNlKCk7XG4gICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihPQkpFQ1RfU1RPUkVfTkFNRSwgJ3JlYWR3cml0ZScpO1xuICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoT0JKRUNUX1NUT1JFX05BTUUpO1xuICAgIGNvbnN0IG9sZFZhbHVlID0gKGF3YWl0IHN0b3JlLmdldChrZXkpKTtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IHVwZGF0ZUZuKG9sZFZhbHVlKTtcbiAgICBpZiAobmV3VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhd2FpdCBzdG9yZS5kZWxldGUoa2V5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGF3YWl0IHN0b3JlLnB1dChuZXdWYWx1ZSwga2V5KTtcbiAgICB9XG4gICAgYXdhaXQgdHguZG9uZTtcbiAgICBpZiAobmV3VmFsdWUgJiYgKCFvbGRWYWx1ZSB8fCBvbGRWYWx1ZS5maWQgIT09IG5ld1ZhbHVlLmZpZCkpIHtcbiAgICAgICAgZmlkQ2hhbmdlZChhcHBDb25maWcsIG5ld1ZhbHVlLmZpZCk7XG4gICAgfVxuICAgIHJldHVybiBuZXdWYWx1ZTtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogVXBkYXRlcyBhbmQgcmV0dXJucyB0aGUgSW5zdGFsbGF0aW9uRW50cnkgZnJvbSB0aGUgZGF0YWJhc2UuXG4gKiBBbHNvIHRyaWdnZXJzIGEgcmVnaXN0cmF0aW9uIHJlcXVlc3QgaWYgaXQgaXMgbmVjZXNzYXJ5IGFuZCBwb3NzaWJsZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0SW5zdGFsbGF0aW9uRW50cnkoaW5zdGFsbGF0aW9ucykge1xuICAgIGxldCByZWdpc3RyYXRpb25Qcm9taXNlO1xuICAgIGNvbnN0IGluc3RhbGxhdGlvbkVudHJ5ID0gYXdhaXQgdXBkYXRlKGluc3RhbGxhdGlvbnMuYXBwQ29uZmlnLCBvbGRFbnRyeSA9PiB7XG4gICAgICAgIGNvbnN0IGluc3RhbGxhdGlvbkVudHJ5ID0gdXBkYXRlT3JDcmVhdGVJbnN0YWxsYXRpb25FbnRyeShvbGRFbnRyeSk7XG4gICAgICAgIGNvbnN0IGVudHJ5V2l0aFByb21pc2UgPSB0cmlnZ2VyUmVnaXN0cmF0aW9uSWZOZWNlc3NhcnkoaW5zdGFsbGF0aW9ucywgaW5zdGFsbGF0aW9uRW50cnkpO1xuICAgICAgICByZWdpc3RyYXRpb25Qcm9taXNlID0gZW50cnlXaXRoUHJvbWlzZS5yZWdpc3RyYXRpb25Qcm9taXNlO1xuICAgICAgICByZXR1cm4gZW50cnlXaXRoUHJvbWlzZS5pbnN0YWxsYXRpb25FbnRyeTtcbiAgICB9KTtcbiAgICBpZiAoaW5zdGFsbGF0aW9uRW50cnkuZmlkID09PSBJTlZBTElEX0ZJRCkge1xuICAgICAgICAvLyBGSUQgZ2VuZXJhdGlvbiBmYWlsZWQuIFdhaXRpbmcgZm9yIHRoZSBGSUQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAgICByZXR1cm4geyBpbnN0YWxsYXRpb25FbnRyeTogYXdhaXQgcmVnaXN0cmF0aW9uUHJvbWlzZSB9O1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBpbnN0YWxsYXRpb25FbnRyeSxcbiAgICAgICAgcmVnaXN0cmF0aW9uUHJvbWlzZVxuICAgIH07XG59XG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgSW5zdGFsbGF0aW9uIEVudHJ5IGlmIG9uZSBkb2VzIG5vdCBleGlzdC5cbiAqIEFsc28gY2xlYXJzIHRpbWVkIG91dCBwZW5kaW5nIHJlcXVlc3RzLlxuICovXG5mdW5jdGlvbiB1cGRhdGVPckNyZWF0ZUluc3RhbGxhdGlvbkVudHJ5KG9sZEVudHJ5KSB7XG4gICAgY29uc3QgZW50cnkgPSBvbGRFbnRyeSB8fCB7XG4gICAgICAgIGZpZDogZ2VuZXJhdGVGaWQoKSxcbiAgICAgICAgcmVnaXN0cmF0aW9uU3RhdHVzOiAwIC8qIFJlcXVlc3RTdGF0dXMuTk9UX1NUQVJURUQgKi9cbiAgICB9O1xuICAgIHJldHVybiBjbGVhclRpbWVkT3V0UmVxdWVzdChlbnRyeSk7XG59XG4vKipcbiAqIElmIHRoZSBGaXJlYmFzZSBJbnN0YWxsYXRpb24gaXMgbm90IHJlZ2lzdGVyZWQgeWV0LCB0aGlzIHdpbGwgdHJpZ2dlciB0aGVcbiAqIHJlZ2lzdHJhdGlvbiBhbmQgcmV0dXJuIGFuIEluUHJvZ3Jlc3NJbnN0YWxsYXRpb25FbnRyeS5cbiAqXG4gKiBJZiByZWdpc3RyYXRpb25Qcm9taXNlIGRvZXMgbm90IGV4aXN0LCB0aGUgaW5zdGFsbGF0aW9uRW50cnkgaXMgZ3VhcmFudGVlZFxuICogdG8gYmUgcmVnaXN0ZXJlZC5cbiAqL1xuZnVuY3Rpb24gdHJpZ2dlclJlZ2lzdHJhdGlvbklmTmVjZXNzYXJ5KGluc3RhbGxhdGlvbnMsIGluc3RhbGxhdGlvbkVudHJ5KSB7XG4gICAgaWYgKGluc3RhbGxhdGlvbkVudHJ5LnJlZ2lzdHJhdGlvblN0YXR1cyA9PT0gMCAvKiBSZXF1ZXN0U3RhdHVzLk5PVF9TVEFSVEVEICovKSB7XG4gICAgICAgIGlmICghbmF2aWdhdG9yLm9uTGluZSkge1xuICAgICAgICAgICAgLy8gUmVnaXN0cmF0aW9uIHJlcXVpcmVkIGJ1dCBhcHAgaXMgb2ZmbGluZS5cbiAgICAgICAgICAgIGNvbnN0IHJlZ2lzdHJhdGlvblByb21pc2VXaXRoRXJyb3IgPSBQcm9taXNlLnJlamVjdChFUlJPUl9GQUNUT1JZLmNyZWF0ZShcImFwcC1vZmZsaW5lXCIgLyogRXJyb3JDb2RlLkFQUF9PRkZMSU5FICovKSk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkVudHJ5LFxuICAgICAgICAgICAgICAgIHJlZ2lzdHJhdGlvblByb21pc2U6IHJlZ2lzdHJhdGlvblByb21pc2VXaXRoRXJyb3JcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gVHJ5IHJlZ2lzdGVyaW5nLiBDaGFuZ2Ugc3RhdHVzIHRvIElOX1BST0dSRVNTLlxuICAgICAgICBjb25zdCBpblByb2dyZXNzRW50cnkgPSB7XG4gICAgICAgICAgICBmaWQ6IGluc3RhbGxhdGlvbkVudHJ5LmZpZCxcbiAgICAgICAgICAgIHJlZ2lzdHJhdGlvblN0YXR1czogMSAvKiBSZXF1ZXN0U3RhdHVzLklOX1BST0dSRVNTICovLFxuICAgICAgICAgICAgcmVnaXN0cmF0aW9uVGltZTogRGF0ZS5ub3coKVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCByZWdpc3RyYXRpb25Qcm9taXNlID0gcmVnaXN0ZXJJbnN0YWxsYXRpb24oaW5zdGFsbGF0aW9ucywgaW5Qcm9ncmVzc0VudHJ5KTtcbiAgICAgICAgcmV0dXJuIHsgaW5zdGFsbGF0aW9uRW50cnk6IGluUHJvZ3Jlc3NFbnRyeSwgcmVnaXN0cmF0aW9uUHJvbWlzZSB9O1xuICAgIH1cbiAgICBlbHNlIGlmIChpbnN0YWxsYXRpb25FbnRyeS5yZWdpc3RyYXRpb25TdGF0dXMgPT09IDEgLyogUmVxdWVzdFN0YXR1cy5JTl9QUk9HUkVTUyAqLykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaW5zdGFsbGF0aW9uRW50cnksXG4gICAgICAgICAgICByZWdpc3RyYXRpb25Qcm9taXNlOiB3YWl0VW50aWxGaWRSZWdpc3RyYXRpb24oaW5zdGFsbGF0aW9ucylcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiB7IGluc3RhbGxhdGlvbkVudHJ5IH07XG4gICAgfVxufVxuLyoqIFRoaXMgd2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UgZm9yIGVhY2ggbmV3IEZpcmViYXNlIEluc3RhbGxhdGlvbi4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVySW5zdGFsbGF0aW9uKGluc3RhbGxhdGlvbnMsIGluc3RhbGxhdGlvbkVudHJ5KSB7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVnaXN0ZXJlZEluc3RhbGxhdGlvbkVudHJ5ID0gYXdhaXQgY3JlYXRlSW5zdGFsbGF0aW9uUmVxdWVzdChpbnN0YWxsYXRpb25zLCBpbnN0YWxsYXRpb25FbnRyeSk7XG4gICAgICAgIHJldHVybiBzZXQoaW5zdGFsbGF0aW9ucy5hcHBDb25maWcsIHJlZ2lzdGVyZWRJbnN0YWxsYXRpb25FbnRyeSk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChpc1NlcnZlckVycm9yKGUpICYmIGUuY3VzdG9tRGF0YS5zZXJ2ZXJDb2RlID09PSA0MDkpIHtcbiAgICAgICAgICAgIC8vIFNlcnZlciByZXR1cm5lZCBhIFwiRklEIGNhbm5vdCBiZSB1c2VkXCIgZXJyb3IuXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBhIG5ldyBJRCBuZXh0IHRpbWUuXG4gICAgICAgICAgICBhd2FpdCByZW1vdmUoaW5zdGFsbGF0aW9ucy5hcHBDb25maWcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVnaXN0cmF0aW9uIGZhaWxlZC4gU2V0IEZJRCBhcyBub3QgcmVnaXN0ZXJlZC5cbiAgICAgICAgICAgIGF3YWl0IHNldChpbnN0YWxsYXRpb25zLmFwcENvbmZpZywge1xuICAgICAgICAgICAgICAgIGZpZDogaW5zdGFsbGF0aW9uRW50cnkuZmlkLFxuICAgICAgICAgICAgICAgIHJlZ2lzdHJhdGlvblN0YXR1czogMCAvKiBSZXF1ZXN0U3RhdHVzLk5PVF9TVEFSVEVEICovXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlO1xuICAgIH1cbn1cbi8qKiBDYWxsIGlmIEZJRCByZWdpc3RyYXRpb24gaXMgcGVuZGluZyBpbiBhbm90aGVyIHJlcXVlc3QuICovXG5hc3luYyBmdW5jdGlvbiB3YWl0VW50aWxGaWRSZWdpc3RyYXRpb24oaW5zdGFsbGF0aW9ucykge1xuICAgIC8vIFVuZm9ydHVuYXRlbHksIHRoZXJlIGlzIG5vIHdheSBvZiByZWxpYWJseSBvYnNlcnZpbmcgd2hlbiBhIHZhbHVlIGluXG4gICAgLy8gSW5kZXhlZERCIGNoYW5nZXMgKHlldCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9XSUNHL2luZGV4ZWQtZGItb2JzZXJ2ZXJzKSxcbiAgICAvLyBzbyB3ZSBuZWVkIHRvIHBvbGwuXG4gICAgbGV0IGVudHJ5ID0gYXdhaXQgdXBkYXRlSW5zdGFsbGF0aW9uUmVxdWVzdChpbnN0YWxsYXRpb25zLmFwcENvbmZpZyk7XG4gICAgd2hpbGUgKGVudHJ5LnJlZ2lzdHJhdGlvblN0YXR1cyA9PT0gMSAvKiBSZXF1ZXN0U3RhdHVzLklOX1BST0dSRVNTICovKSB7XG4gICAgICAgIC8vIGNyZWF0ZUluc3RhbGxhdGlvbiByZXF1ZXN0IHN0aWxsIGluIHByb2dyZXNzLlxuICAgICAgICBhd2FpdCBzbGVlcCgxMDApO1xuICAgICAgICBlbnRyeSA9IGF3YWl0IHVwZGF0ZUluc3RhbGxhdGlvblJlcXVlc3QoaW5zdGFsbGF0aW9ucy5hcHBDb25maWcpO1xuICAgIH1cbiAgICBpZiAoZW50cnkucmVnaXN0cmF0aW9uU3RhdHVzID09PSAwIC8qIFJlcXVlc3RTdGF0dXMuTk9UX1NUQVJURUQgKi8pIHtcbiAgICAgICAgLy8gVGhlIHJlcXVlc3QgdGltZWQgb3V0IG9yIGZhaWxlZCBpbiBhIGRpZmZlcmVudCBjYWxsLiBUcnkgYWdhaW4uXG4gICAgICAgIGNvbnN0IHsgaW5zdGFsbGF0aW9uRW50cnksIHJlZ2lzdHJhdGlvblByb21pc2UgfSA9IGF3YWl0IGdldEluc3RhbGxhdGlvbkVudHJ5KGluc3RhbGxhdGlvbnMpO1xuICAgICAgICBpZiAocmVnaXN0cmF0aW9uUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlZ2lzdHJhdGlvblByb21pc2U7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBpZiB0aGVyZSBpcyBubyByZWdpc3RyYXRpb25Qcm9taXNlLCBlbnRyeSBpcyByZWdpc3RlcmVkLlxuICAgICAgICAgICAgcmV0dXJuIGluc3RhbGxhdGlvbkVudHJ5O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbnRyeTtcbn1cbi8qKlxuICogQ2FsbGVkIG9ubHkgaWYgdGhlcmUgaXMgYSBDcmVhdGVJbnN0YWxsYXRpb24gcmVxdWVzdCBpbiBwcm9ncmVzcy5cbiAqXG4gKiBVcGRhdGVzIHRoZSBJbnN0YWxsYXRpb25FbnRyeSBpbiB0aGUgREIgYmFzZWQgb24gdGhlIHN0YXR1cyBvZiB0aGVcbiAqIENyZWF0ZUluc3RhbGxhdGlvbiByZXF1ZXN0LlxuICpcbiAqIFJldHVybnMgdGhlIHVwZGF0ZWQgSW5zdGFsbGF0aW9uRW50cnkuXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZUluc3RhbGxhdGlvblJlcXVlc3QoYXBwQ29uZmlnKSB7XG4gICAgcmV0dXJuIHVwZGF0ZShhcHBDb25maWcsIG9sZEVudHJ5ID0+IHtcbiAgICAgICAgaWYgKCFvbGRFbnRyeSkge1xuICAgICAgICAgICAgdGhyb3cgRVJST1JfRkFDVE9SWS5jcmVhdGUoXCJpbnN0YWxsYXRpb24tbm90LWZvdW5kXCIgLyogRXJyb3JDb2RlLklOU1RBTExBVElPTl9OT1RfRk9VTkQgKi8pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVkT3V0UmVxdWVzdChvbGRFbnRyeSk7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjbGVhclRpbWVkT3V0UmVxdWVzdChlbnRyeSkge1xuICAgIGlmIChoYXNJbnN0YWxsYXRpb25SZXF1ZXN0VGltZWRPdXQoZW50cnkpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBmaWQ6IGVudHJ5LmZpZCxcbiAgICAgICAgICAgIHJlZ2lzdHJhdGlvblN0YXR1czogMCAvKiBSZXF1ZXN0U3RhdHVzLk5PVF9TVEFSVEVEICovXG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBlbnRyeTtcbn1cbmZ1bmN0aW9uIGhhc0luc3RhbGxhdGlvblJlcXVlc3RUaW1lZE91dChpbnN0YWxsYXRpb25FbnRyeSkge1xuICAgIHJldHVybiAoaW5zdGFsbGF0aW9uRW50cnkucmVnaXN0cmF0aW9uU3RhdHVzID09PSAxIC8qIFJlcXVlc3RTdGF0dXMuSU5fUFJPR1JFU1MgKi8gJiZcbiAgICAgICAgaW5zdGFsbGF0aW9uRW50cnkucmVnaXN0cmF0aW9uVGltZSArIFBFTkRJTkdfVElNRU9VVF9NUyA8IERhdGUubm93KCkpO1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVBdXRoVG9rZW5SZXF1ZXN0KHsgYXBwQ29uZmlnLCBoZWFydGJlYXRTZXJ2aWNlUHJvdmlkZXIgfSwgaW5zdGFsbGF0aW9uRW50cnkpIHtcbiAgICBjb25zdCBlbmRwb2ludCA9IGdldEdlbmVyYXRlQXV0aFRva2VuRW5kcG9pbnQoYXBwQ29uZmlnLCBpbnN0YWxsYXRpb25FbnRyeSk7XG4gICAgY29uc3QgaGVhZGVycyA9IGdldEhlYWRlcnNXaXRoQXV0aChhcHBDb25maWcsIGluc3RhbGxhdGlvbkVudHJ5KTtcbiAgICAvLyBJZiBoZWFydGJlYXQgc2VydmljZSBleGlzdHMsIGFkZCB0aGUgaGVhcnRiZWF0IHN0cmluZyB0byB0aGUgaGVhZGVyLlxuICAgIGNvbnN0IGhlYXJ0YmVhdFNlcnZpY2UgPSBoZWFydGJlYXRTZXJ2aWNlUHJvdmlkZXIuZ2V0SW1tZWRpYXRlKHtcbiAgICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9KTtcbiAgICBpZiAoaGVhcnRiZWF0U2VydmljZSkge1xuICAgICAgICBjb25zdCBoZWFydGJlYXRzSGVhZGVyID0gYXdhaXQgaGVhcnRiZWF0U2VydmljZS5nZXRIZWFydGJlYXRzSGVhZGVyKCk7XG4gICAgICAgIGlmIChoZWFydGJlYXRzSGVhZGVyKSB7XG4gICAgICAgICAgICBoZWFkZXJzLmFwcGVuZCgneC1maXJlYmFzZS1jbGllbnQnLCBoZWFydGJlYXRzSGVhZGVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBib2R5ID0ge1xuICAgICAgICBpbnN0YWxsYXRpb246IHtcbiAgICAgICAgICAgIHNka1ZlcnNpb246IFBBQ0tBR0VfVkVSU0lPTixcbiAgICAgICAgICAgIGFwcElkOiBhcHBDb25maWcuYXBwSWRcbiAgICAgICAgfVxuICAgIH07XG4gICAgY29uc3QgcmVxdWVzdCA9IHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpXG4gICAgfTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJldHJ5SWZTZXJ2ZXJFcnJvcigoKSA9PiBmZXRjaChlbmRwb2ludCwgcmVxdWVzdCkpO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgICBjb25zdCByZXNwb25zZVZhbHVlID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICBjb25zdCBjb21wbGV0ZWRBdXRoVG9rZW4gPSBleHRyYWN0QXV0aFRva2VuSW5mb0Zyb21SZXNwb25zZShyZXNwb25zZVZhbHVlKTtcbiAgICAgICAgcmV0dXJuIGNvbXBsZXRlZEF1dGhUb2tlbjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRocm93IGF3YWl0IGdldEVycm9yRnJvbVJlc3BvbnNlKCdHZW5lcmF0ZSBBdXRoIFRva2VuJywgcmVzcG9uc2UpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGdldEdlbmVyYXRlQXV0aFRva2VuRW5kcG9pbnQoYXBwQ29uZmlnLCB7IGZpZCB9KSB7XG4gICAgcmV0dXJuIGAke2dldEluc3RhbGxhdGlvbnNFbmRwb2ludChhcHBDb25maWcpfS8ke2ZpZH0vYXV0aFRva2VuczpnZW5lcmF0ZWA7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIFJldHVybnMgYSB2YWxpZCBhdXRoZW50aWNhdGlvbiB0b2tlbiBmb3IgdGhlIGluc3RhbGxhdGlvbi4gR2VuZXJhdGVzIGEgbmV3XG4gKiB0b2tlbiBpZiBvbmUgZG9lc24ndCBleGlzdCwgaXMgZXhwaXJlZCBvciBhYm91dCB0byBleHBpcmUuXG4gKlxuICogU2hvdWxkIG9ubHkgYmUgY2FsbGVkIGlmIHRoZSBGaXJlYmFzZSBJbnN0YWxsYXRpb24gaXMgcmVnaXN0ZXJlZC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVmcmVzaEF1dGhUb2tlbihpbnN0YWxsYXRpb25zLCBmb3JjZVJlZnJlc2ggPSBmYWxzZSkge1xuICAgIGxldCB0b2tlblByb21pc2U7XG4gICAgY29uc3QgZW50cnkgPSBhd2FpdCB1cGRhdGUoaW5zdGFsbGF0aW9ucy5hcHBDb25maWcsIG9sZEVudHJ5ID0+IHtcbiAgICAgICAgaWYgKCFpc0VudHJ5UmVnaXN0ZXJlZChvbGRFbnRyeSkpIHtcbiAgICAgICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwibm90LXJlZ2lzdGVyZWRcIiAvKiBFcnJvckNvZGUuTk9UX1JFR0lTVEVSRUQgKi8pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9sZEF1dGhUb2tlbiA9IG9sZEVudHJ5LmF1dGhUb2tlbjtcbiAgICAgICAgaWYgKCFmb3JjZVJlZnJlc2ggJiYgaXNBdXRoVG9rZW5WYWxpZChvbGRBdXRoVG9rZW4pKSB7XG4gICAgICAgICAgICAvLyBUaGVyZSBpcyBhIHZhbGlkIHRva2VuIGluIHRoZSBEQi5cbiAgICAgICAgICAgIHJldHVybiBvbGRFbnRyeTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChvbGRBdXRoVG9rZW4ucmVxdWVzdFN0YXR1cyA9PT0gMSAvKiBSZXF1ZXN0U3RhdHVzLklOX1BST0dSRVNTICovKSB7XG4gICAgICAgICAgICAvLyBUaGVyZSBhbHJlYWR5IGlzIGEgdG9rZW4gcmVxdWVzdCBpbiBwcm9ncmVzcy5cbiAgICAgICAgICAgIHRva2VuUHJvbWlzZSA9IHdhaXRVbnRpbEF1dGhUb2tlblJlcXVlc3QoaW5zdGFsbGF0aW9ucywgZm9yY2VSZWZyZXNoKTtcbiAgICAgICAgICAgIHJldHVybiBvbGRFbnRyeTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vIHRva2VuIG9yIHRva2VuIGV4cGlyZWQuXG4gICAgICAgICAgICBpZiAoIW5hdmlnYXRvci5vbkxpbmUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcImFwcC1vZmZsaW5lXCIgLyogRXJyb3JDb2RlLkFQUF9PRkZMSU5FICovKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGluUHJvZ3Jlc3NFbnRyeSA9IG1ha2VBdXRoVG9rZW5SZXF1ZXN0SW5Qcm9ncmVzc0VudHJ5KG9sZEVudHJ5KTtcbiAgICAgICAgICAgIHRva2VuUHJvbWlzZSA9IGZldGNoQXV0aFRva2VuRnJvbVNlcnZlcihpbnN0YWxsYXRpb25zLCBpblByb2dyZXNzRW50cnkpO1xuICAgICAgICAgICAgcmV0dXJuIGluUHJvZ3Jlc3NFbnRyeTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGNvbnN0IGF1dGhUb2tlbiA9IHRva2VuUHJvbWlzZVxuICAgICAgICA/IGF3YWl0IHRva2VuUHJvbWlzZVxuICAgICAgICA6IGVudHJ5LmF1dGhUb2tlbjtcbiAgICByZXR1cm4gYXV0aFRva2VuO1xufVxuLyoqXG4gKiBDYWxsIG9ubHkgaWYgRklEIGlzIHJlZ2lzdGVyZWQgYW5kIEF1dGggVG9rZW4gcmVxdWVzdCBpcyBpbiBwcm9ncmVzcy5cbiAqXG4gKiBXYWl0cyB1bnRpbCB0aGUgY3VycmVudCBwZW5kaW5nIHJlcXVlc3QgZmluaXNoZXMuIElmIHRoZSByZXF1ZXN0IHRpbWVzIG91dCxcbiAqIHRyaWVzIG9uY2UgaW4gdGhpcyB0aHJlYWQgYXMgd2VsbC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gd2FpdFVudGlsQXV0aFRva2VuUmVxdWVzdChpbnN0YWxsYXRpb25zLCBmb3JjZVJlZnJlc2gpIHtcbiAgICAvLyBVbmZvcnR1bmF0ZWx5LCB0aGVyZSBpcyBubyB3YXkgb2YgcmVsaWFibHkgb2JzZXJ2aW5nIHdoZW4gYSB2YWx1ZSBpblxuICAgIC8vIEluZGV4ZWREQiBjaGFuZ2VzICh5ZXQsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vV0lDRy9pbmRleGVkLWRiLW9ic2VydmVycyksXG4gICAgLy8gc28gd2UgbmVlZCB0byBwb2xsLlxuICAgIGxldCBlbnRyeSA9IGF3YWl0IHVwZGF0ZUF1dGhUb2tlblJlcXVlc3QoaW5zdGFsbGF0aW9ucy5hcHBDb25maWcpO1xuICAgIHdoaWxlIChlbnRyeS5hdXRoVG9rZW4ucmVxdWVzdFN0YXR1cyA9PT0gMSAvKiBSZXF1ZXN0U3RhdHVzLklOX1BST0dSRVNTICovKSB7XG4gICAgICAgIC8vIGdlbmVyYXRlQXV0aFRva2VuIHN0aWxsIGluIHByb2dyZXNzLlxuICAgICAgICBhd2FpdCBzbGVlcCgxMDApO1xuICAgICAgICBlbnRyeSA9IGF3YWl0IHVwZGF0ZUF1dGhUb2tlblJlcXVlc3QoaW5zdGFsbGF0aW9ucy5hcHBDb25maWcpO1xuICAgIH1cbiAgICBjb25zdCBhdXRoVG9rZW4gPSBlbnRyeS5hdXRoVG9rZW47XG4gICAgaWYgKGF1dGhUb2tlbi5yZXF1ZXN0U3RhdHVzID09PSAwIC8qIFJlcXVlc3RTdGF0dXMuTk9UX1NUQVJURUQgKi8pIHtcbiAgICAgICAgLy8gVGhlIHJlcXVlc3QgdGltZWQgb3V0IG9yIGZhaWxlZCBpbiBhIGRpZmZlcmVudCBjYWxsLiBUcnkgYWdhaW4uXG4gICAgICAgIHJldHVybiByZWZyZXNoQXV0aFRva2VuKGluc3RhbGxhdGlvbnMsIGZvcmNlUmVmcmVzaCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gYXV0aFRva2VuO1xuICAgIH1cbn1cbi8qKlxuICogQ2FsbGVkIG9ubHkgaWYgdGhlcmUgaXMgYSBHZW5lcmF0ZUF1dGhUb2tlbiByZXF1ZXN0IGluIHByb2dyZXNzLlxuICpcbiAqIFVwZGF0ZXMgdGhlIEluc3RhbGxhdGlvbkVudHJ5IGluIHRoZSBEQiBiYXNlZCBvbiB0aGUgc3RhdHVzIG9mIHRoZVxuICogR2VuZXJhdGVBdXRoVG9rZW4gcmVxdWVzdC5cbiAqXG4gKiBSZXR1cm5zIHRoZSB1cGRhdGVkIEluc3RhbGxhdGlvbkVudHJ5LlxuICovXG5mdW5jdGlvbiB1cGRhdGVBdXRoVG9rZW5SZXF1ZXN0KGFwcENvbmZpZykge1xuICAgIHJldHVybiB1cGRhdGUoYXBwQ29uZmlnLCBvbGRFbnRyeSA9PiB7XG4gICAgICAgIGlmICghaXNFbnRyeVJlZ2lzdGVyZWQob2xkRW50cnkpKSB7XG4gICAgICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcIm5vdC1yZWdpc3RlcmVkXCIgLyogRXJyb3JDb2RlLk5PVF9SRUdJU1RFUkVEICovKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRBdXRoVG9rZW4gPSBvbGRFbnRyeS5hdXRoVG9rZW47XG4gICAgICAgIGlmIChoYXNBdXRoVG9rZW5SZXF1ZXN0VGltZWRPdXQob2xkQXV0aFRva2VuKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAuLi5vbGRFbnRyeSxcbiAgICAgICAgICAgICAgICBhdXRoVG9rZW46IHsgcmVxdWVzdFN0YXR1czogMCAvKiBSZXF1ZXN0U3RhdHVzLk5PVF9TVEFSVEVEICovIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9sZEVudHJ5O1xuICAgIH0pO1xufVxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hBdXRoVG9rZW5Gcm9tU2VydmVyKGluc3RhbGxhdGlvbnMsIGluc3RhbGxhdGlvbkVudHJ5KSB7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYXV0aFRva2VuID0gYXdhaXQgZ2VuZXJhdGVBdXRoVG9rZW5SZXF1ZXN0KGluc3RhbGxhdGlvbnMsIGluc3RhbGxhdGlvbkVudHJ5KTtcbiAgICAgICAgY29uc3QgdXBkYXRlZEluc3RhbGxhdGlvbkVudHJ5ID0ge1xuICAgICAgICAgICAgLi4uaW5zdGFsbGF0aW9uRW50cnksXG4gICAgICAgICAgICBhdXRoVG9rZW5cbiAgICAgICAgfTtcbiAgICAgICAgYXdhaXQgc2V0KGluc3RhbGxhdGlvbnMuYXBwQ29uZmlnLCB1cGRhdGVkSW5zdGFsbGF0aW9uRW50cnkpO1xuICAgICAgICByZXR1cm4gYXV0aFRva2VuO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoaXNTZXJ2ZXJFcnJvcihlKSAmJlxuICAgICAgICAgICAgKGUuY3VzdG9tRGF0YS5zZXJ2ZXJDb2RlID09PSA0MDEgfHwgZS5jdXN0b21EYXRhLnNlcnZlckNvZGUgPT09IDQwNCkpIHtcbiAgICAgICAgICAgIC8vIFNlcnZlciByZXR1cm5lZCBhIFwiRklEIG5vdCBmb3VuZFwiIG9yIGEgXCJJbnZhbGlkIGF1dGhlbnRpY2F0aW9uXCIgZXJyb3IuXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBhIG5ldyBJRCBuZXh0IHRpbWUuXG4gICAgICAgICAgICBhd2FpdCByZW1vdmUoaW5zdGFsbGF0aW9ucy5hcHBDb25maWcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlZEluc3RhbGxhdGlvbkVudHJ5ID0ge1xuICAgICAgICAgICAgICAgIC4uLmluc3RhbGxhdGlvbkVudHJ5LFxuICAgICAgICAgICAgICAgIGF1dGhUb2tlbjogeyByZXF1ZXN0U3RhdHVzOiAwIC8qIFJlcXVlc3RTdGF0dXMuTk9UX1NUQVJURUQgKi8gfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHNldChpbnN0YWxsYXRpb25zLmFwcENvbmZpZywgdXBkYXRlZEluc3RhbGxhdGlvbkVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGlzRW50cnlSZWdpc3RlcmVkKGluc3RhbGxhdGlvbkVudHJ5KSB7XG4gICAgcmV0dXJuIChpbnN0YWxsYXRpb25FbnRyeSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIGluc3RhbGxhdGlvbkVudHJ5LnJlZ2lzdHJhdGlvblN0YXR1cyA9PT0gMiAvKiBSZXF1ZXN0U3RhdHVzLkNPTVBMRVRFRCAqLyk7XG59XG5mdW5jdGlvbiBpc0F1dGhUb2tlblZhbGlkKGF1dGhUb2tlbikge1xuICAgIHJldHVybiAoYXV0aFRva2VuLnJlcXVlc3RTdGF0dXMgPT09IDIgLyogUmVxdWVzdFN0YXR1cy5DT01QTEVURUQgKi8gJiZcbiAgICAgICAgIWlzQXV0aFRva2VuRXhwaXJlZChhdXRoVG9rZW4pKTtcbn1cbmZ1bmN0aW9uIGlzQXV0aFRva2VuRXhwaXJlZChhdXRoVG9rZW4pIHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIHJldHVybiAobm93IDwgYXV0aFRva2VuLmNyZWF0aW9uVGltZSB8fFxuICAgICAgICBhdXRoVG9rZW4uY3JlYXRpb25UaW1lICsgYXV0aFRva2VuLmV4cGlyZXNJbiA8IG5vdyArIFRPS0VOX0VYUElSQVRJT05fQlVGRkVSKTtcbn1cbi8qKiBSZXR1cm5zIGFuIHVwZGF0ZWQgSW5zdGFsbGF0aW9uRW50cnkgd2l0aCBhbiBJblByb2dyZXNzQXV0aFRva2VuLiAqL1xuZnVuY3Rpb24gbWFrZUF1dGhUb2tlblJlcXVlc3RJblByb2dyZXNzRW50cnkob2xkRW50cnkpIHtcbiAgICBjb25zdCBpblByb2dyZXNzQXV0aFRva2VuID0ge1xuICAgICAgICByZXF1ZXN0U3RhdHVzOiAxIC8qIFJlcXVlc3RTdGF0dXMuSU5fUFJPR1JFU1MgKi8sXG4gICAgICAgIHJlcXVlc3RUaW1lOiBEYXRlLm5vdygpXG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICAuLi5vbGRFbnRyeSxcbiAgICAgICAgYXV0aFRva2VuOiBpblByb2dyZXNzQXV0aFRva2VuXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGhhc0F1dGhUb2tlblJlcXVlc3RUaW1lZE91dChhdXRoVG9rZW4pIHtcbiAgICByZXR1cm4gKGF1dGhUb2tlbi5yZXF1ZXN0U3RhdHVzID09PSAxIC8qIFJlcXVlc3RTdGF0dXMuSU5fUFJPR1JFU1MgKi8gJiZcbiAgICAgICAgYXV0aFRva2VuLnJlcXVlc3RUaW1lICsgUEVORElOR19USU1FT1VUX01TIDwgRGF0ZS5ub3coKSk7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIENyZWF0ZXMgYSBGaXJlYmFzZSBJbnN0YWxsYXRpb24gaWYgdGhlcmUgaXNuJ3Qgb25lIGZvciB0aGUgYXBwIGFuZFxuICogcmV0dXJucyB0aGUgSW5zdGFsbGF0aW9uIElELlxuICogQHBhcmFtIGluc3RhbGxhdGlvbnMgLSBUaGUgYEluc3RhbGxhdGlvbnNgIGluc3RhbmNlLlxuICpcbiAqIEBwdWJsaWNcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0SWQoaW5zdGFsbGF0aW9ucykge1xuICAgIGNvbnN0IGluc3RhbGxhdGlvbnNJbXBsID0gaW5zdGFsbGF0aW9ucztcbiAgICBjb25zdCB7IGluc3RhbGxhdGlvbkVudHJ5LCByZWdpc3RyYXRpb25Qcm9taXNlIH0gPSBhd2FpdCBnZXRJbnN0YWxsYXRpb25FbnRyeShpbnN0YWxsYXRpb25zSW1wbCk7XG4gICAgaWYgKHJlZ2lzdHJhdGlvblByb21pc2UpIHtcbiAgICAgICAgcmVnaXN0cmF0aW9uUHJvbWlzZS5jYXRjaChjb25zb2xlLmVycm9yKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIElmIHRoZSBpbnN0YWxsYXRpb24gaXMgYWxyZWFkeSByZWdpc3RlcmVkLCB1cGRhdGUgdGhlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIC8vIHRva2VuIGlmIG5lZWRlZC5cbiAgICAgICAgcmVmcmVzaEF1dGhUb2tlbihpbnN0YWxsYXRpb25zSW1wbCkuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgfVxuICAgIHJldHVybiBpbnN0YWxsYXRpb25FbnRyeS5maWQ7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIFJldHVybnMgYSBGaXJlYmFzZSBJbnN0YWxsYXRpb25zIGF1dGggdG9rZW4sIGlkZW50aWZ5aW5nIHRoZSBjdXJyZW50XG4gKiBGaXJlYmFzZSBJbnN0YWxsYXRpb24uXG4gKiBAcGFyYW0gaW5zdGFsbGF0aW9ucyAtIFRoZSBgSW5zdGFsbGF0aW9uc2AgaW5zdGFuY2UuXG4gKiBAcGFyYW0gZm9yY2VSZWZyZXNoIC0gRm9yY2UgcmVmcmVzaCByZWdhcmRsZXNzIG9mIHRva2VuIGV4cGlyYXRpb24uXG4gKlxuICogQHB1YmxpY1xuICovXG5hc3luYyBmdW5jdGlvbiBnZXRUb2tlbihpbnN0YWxsYXRpb25zLCBmb3JjZVJlZnJlc2ggPSBmYWxzZSkge1xuICAgIGNvbnN0IGluc3RhbGxhdGlvbnNJbXBsID0gaW5zdGFsbGF0aW9ucztcbiAgICBhd2FpdCBjb21wbGV0ZUluc3RhbGxhdGlvblJlZ2lzdHJhdGlvbihpbnN0YWxsYXRpb25zSW1wbCk7XG4gICAgLy8gQXQgdGhpcyBwb2ludCB3ZSBlaXRoZXIgaGF2ZSBhIFJlZ2lzdGVyZWQgSW5zdGFsbGF0aW9uIGluIHRoZSBEQiwgb3Igd2UndmVcbiAgICAvLyBhbHJlYWR5IHRocm93biBhbiBlcnJvci5cbiAgICBjb25zdCBhdXRoVG9rZW4gPSBhd2FpdCByZWZyZXNoQXV0aFRva2VuKGluc3RhbGxhdGlvbnNJbXBsLCBmb3JjZVJlZnJlc2gpO1xuICAgIHJldHVybiBhdXRoVG9rZW4udG9rZW47XG59XG5hc3luYyBmdW5jdGlvbiBjb21wbGV0ZUluc3RhbGxhdGlvblJlZ2lzdHJhdGlvbihpbnN0YWxsYXRpb25zKSB7XG4gICAgY29uc3QgeyByZWdpc3RyYXRpb25Qcm9taXNlIH0gPSBhd2FpdCBnZXRJbnN0YWxsYXRpb25FbnRyeShpbnN0YWxsYXRpb25zKTtcbiAgICBpZiAocmVnaXN0cmF0aW9uUHJvbWlzZSkge1xuICAgICAgICAvLyBBIGNyZWF0ZUluc3RhbGxhdGlvbiByZXF1ZXN0IGlzIGluIHByb2dyZXNzLiBXYWl0IHVudGlsIGl0IGZpbmlzaGVzLlxuICAgICAgICBhd2FpdCByZWdpc3RyYXRpb25Qcm9taXNlO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUluc3RhbGxhdGlvblJlcXVlc3QoYXBwQ29uZmlnLCBpbnN0YWxsYXRpb25FbnRyeSkge1xuICAgIGNvbnN0IGVuZHBvaW50ID0gZ2V0RGVsZXRlRW5kcG9pbnQoYXBwQ29uZmlnLCBpbnN0YWxsYXRpb25FbnRyeSk7XG4gICAgY29uc3QgaGVhZGVycyA9IGdldEhlYWRlcnNXaXRoQXV0aChhcHBDb25maWcsIGluc3RhbGxhdGlvbkVudHJ5KTtcbiAgICBjb25zdCByZXF1ZXN0ID0ge1xuICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICBoZWFkZXJzXG4gICAgfTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJldHJ5SWZTZXJ2ZXJFcnJvcigoKSA9PiBmZXRjaChlbmRwb2ludCwgcmVxdWVzdCkpO1xuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgYXdhaXQgZ2V0RXJyb3JGcm9tUmVzcG9uc2UoJ0RlbGV0ZSBJbnN0YWxsYXRpb24nLCByZXNwb25zZSk7XG4gICAgfVxufVxuZnVuY3Rpb24gZ2V0RGVsZXRlRW5kcG9pbnQoYXBwQ29uZmlnLCB7IGZpZCB9KSB7XG4gICAgcmV0dXJuIGAke2dldEluc3RhbGxhdGlvbnNFbmRwb2ludChhcHBDb25maWcpfS8ke2ZpZH1gO1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBEZWxldGVzIHRoZSBGaXJlYmFzZSBJbnN0YWxsYXRpb24gYW5kIGFsbCBhc3NvY2lhdGVkIGRhdGEuXG4gKiBAcGFyYW0gaW5zdGFsbGF0aW9ucyAtIFRoZSBgSW5zdGFsbGF0aW9uc2AgaW5zdGFuY2UuXG4gKlxuICogQHB1YmxpY1xuICovXG5hc3luYyBmdW5jdGlvbiBkZWxldGVJbnN0YWxsYXRpb25zKGluc3RhbGxhdGlvbnMpIHtcbiAgICBjb25zdCB7IGFwcENvbmZpZyB9ID0gaW5zdGFsbGF0aW9ucztcbiAgICBjb25zdCBlbnRyeSA9IGF3YWl0IHVwZGF0ZShhcHBDb25maWcsIG9sZEVudHJ5ID0+IHtcbiAgICAgICAgaWYgKG9sZEVudHJ5ICYmIG9sZEVudHJ5LnJlZ2lzdHJhdGlvblN0YXR1cyA9PT0gMCAvKiBSZXF1ZXN0U3RhdHVzLk5PVF9TVEFSVEVEICovKSB7XG4gICAgICAgICAgICAvLyBEZWxldGUgdGhlIHVucmVnaXN0ZXJlZCBlbnRyeSB3aXRob3V0IHNlbmRpbmcgYSBkZWxldGVJbnN0YWxsYXRpb24gcmVxdWVzdC5cbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9sZEVudHJ5O1xuICAgIH0pO1xuICAgIGlmIChlbnRyeSkge1xuICAgICAgICBpZiAoZW50cnkucmVnaXN0cmF0aW9uU3RhdHVzID09PSAxIC8qIFJlcXVlc3RTdGF0dXMuSU5fUFJPR1JFU1MgKi8pIHtcbiAgICAgICAgICAgIC8vIENhbid0IGRlbGV0ZSB3aGlsZSB0cnlpbmcgdG8gcmVnaXN0ZXIuXG4gICAgICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcImRlbGV0ZS1wZW5kaW5nLXJlZ2lzdHJhdGlvblwiIC8qIEVycm9yQ29kZS5ERUxFVEVfUEVORElOR19SRUdJU1RSQVRJT04gKi8pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGVudHJ5LnJlZ2lzdHJhdGlvblN0YXR1cyA9PT0gMiAvKiBSZXF1ZXN0U3RhdHVzLkNPTVBMRVRFRCAqLykge1xuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3Iub25MaW5lKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRVJST1JfRkFDVE9SWS5jcmVhdGUoXCJhcHAtb2ZmbGluZVwiIC8qIEVycm9yQ29kZS5BUFBfT0ZGTElORSAqLyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBkZWxldGVJbnN0YWxsYXRpb25SZXF1ZXN0KGFwcENvbmZpZywgZW50cnkpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHJlbW92ZShhcHBDb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBTZXRzIGEgbmV3IGNhbGxiYWNrIHRoYXQgd2lsbCBnZXQgY2FsbGVkIHdoZW4gSW5zdGFsbGF0aW9uIElEIGNoYW5nZXMuXG4gKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgd2lsbCByZW1vdmUgdGhlIGNhbGxiYWNrIHdoZW4gY2FsbGVkLlxuICogQHBhcmFtIGluc3RhbGxhdGlvbnMgLSBUaGUgYEluc3RhbGxhdGlvbnNgIGluc3RhbmNlLlxuICogQHBhcmFtIGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgaXMgaW52b2tlZCB3aGVuIEZJRCBjaGFuZ2VzLlxuICogQHJldHVybnMgQSBmdW5jdGlvbiB0aGF0IGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gKlxuICogQHB1YmxpY1xuICovXG5mdW5jdGlvbiBvbklkQ2hhbmdlKGluc3RhbGxhdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgeyBhcHBDb25maWcgfSA9IGluc3RhbGxhdGlvbnM7XG4gICAgYWRkQ2FsbGJhY2soYXBwQ29uZmlnLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgcmVtb3ZlQ2FsbGJhY2soYXBwQ29uZmlnLCBjYWxsYmFjayk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogUmV0dXJucyBhbiBpbnN0YW5jZSBvZiB7QGxpbmsgSW5zdGFsbGF0aW9uc30gYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlblxuICoge0BsaW5rIEBmaXJlYmFzZS9hcHAjRmlyZWJhc2VBcHB9IGluc3RhbmNlLlxuICogQHBhcmFtIGFwcCAtIFRoZSB7QGxpbmsgQGZpcmViYXNlL2FwcCNGaXJlYmFzZUFwcH0gaW5zdGFuY2UuXG4gKlxuICogQHB1YmxpY1xuICovXG5mdW5jdGlvbiBnZXRJbnN0YWxsYXRpb25zKGFwcCA9IGdldEFwcCgpKSB7XG4gICAgY29uc3QgaW5zdGFsbGF0aW9uc0ltcGwgPSBfZ2V0UHJvdmlkZXIoYXBwLCAnaW5zdGFsbGF0aW9ucycpLmdldEltbWVkaWF0ZSgpO1xuICAgIHJldHVybiBpbnN0YWxsYXRpb25zSW1wbDtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RBcHBDb25maWcoYXBwKSB7XG4gICAgaWYgKCFhcHAgfHwgIWFwcC5vcHRpb25zKSB7XG4gICAgICAgIHRocm93IGdldE1pc3NpbmdWYWx1ZUVycm9yKCdBcHAgQ29uZmlndXJhdGlvbicpO1xuICAgIH1cbiAgICBpZiAoIWFwcC5uYW1lKSB7XG4gICAgICAgIHRocm93IGdldE1pc3NpbmdWYWx1ZUVycm9yKCdBcHAgTmFtZScpO1xuICAgIH1cbiAgICAvLyBSZXF1aXJlZCBhcHAgY29uZmlnIGtleXNcbiAgICBjb25zdCBjb25maWdLZXlzID0gW1xuICAgICAgICAncHJvamVjdElkJyxcbiAgICAgICAgJ2FwaUtleScsXG4gICAgICAgICdhcHBJZCdcbiAgICBdO1xuICAgIGZvciAoY29uc3Qga2V5TmFtZSBvZiBjb25maWdLZXlzKSB7XG4gICAgICAgIGlmICghYXBwLm9wdGlvbnNba2V5TmFtZV0pIHtcbiAgICAgICAgICAgIHRocm93IGdldE1pc3NpbmdWYWx1ZUVycm9yKGtleU5hbWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGFwcE5hbWU6IGFwcC5uYW1lLFxuICAgICAgICBwcm9qZWN0SWQ6IGFwcC5vcHRpb25zLnByb2plY3RJZCxcbiAgICAgICAgYXBpS2V5OiBhcHAub3B0aW9ucy5hcGlLZXksXG4gICAgICAgIGFwcElkOiBhcHAub3B0aW9ucy5hcHBJZFxuICAgIH07XG59XG5mdW5jdGlvbiBnZXRNaXNzaW5nVmFsdWVFcnJvcih2YWx1ZU5hbWUpIHtcbiAgICByZXR1cm4gRVJST1JfRkFDVE9SWS5jcmVhdGUoXCJtaXNzaW5nLWFwcC1jb25maWctdmFsdWVzXCIgLyogRXJyb3JDb2RlLk1JU1NJTkdfQVBQX0NPTkZJR19WQUxVRVMgKi8sIHtcbiAgICAgICAgdmFsdWVOYW1lXG4gICAgfSk7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5jb25zdCBJTlNUQUxMQVRJT05TX05BTUUgPSAnaW5zdGFsbGF0aW9ucyc7XG5jb25zdCBJTlNUQUxMQVRJT05TX05BTUVfSU5URVJOQUwgPSAnaW5zdGFsbGF0aW9ucy1pbnRlcm5hbCc7XG5jb25zdCBwdWJsaWNGYWN0b3J5ID0gKGNvbnRhaW5lcikgPT4ge1xuICAgIGNvbnN0IGFwcCA9IGNvbnRhaW5lci5nZXRQcm92aWRlcignYXBwJykuZ2V0SW1tZWRpYXRlKCk7XG4gICAgLy8gVGhyb3dzIGlmIGFwcCBpc24ndCBjb25maWd1cmVkIHByb3Blcmx5LlxuICAgIGNvbnN0IGFwcENvbmZpZyA9IGV4dHJhY3RBcHBDb25maWcoYXBwKTtcbiAgICBjb25zdCBoZWFydGJlYXRTZXJ2aWNlUHJvdmlkZXIgPSBfZ2V0UHJvdmlkZXIoYXBwLCAnaGVhcnRiZWF0Jyk7XG4gICAgY29uc3QgaW5zdGFsbGF0aW9uc0ltcGwgPSB7XG4gICAgICAgIGFwcCxcbiAgICAgICAgYXBwQ29uZmlnLFxuICAgICAgICBoZWFydGJlYXRTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgIF9kZWxldGU6ICgpID0+IFByb21pc2UucmVzb2x2ZSgpXG4gICAgfTtcbiAgICByZXR1cm4gaW5zdGFsbGF0aW9uc0ltcGw7XG59O1xuY29uc3QgaW50ZXJuYWxGYWN0b3J5ID0gKGNvbnRhaW5lcikgPT4ge1xuICAgIGNvbnN0IGFwcCA9IGNvbnRhaW5lci5nZXRQcm92aWRlcignYXBwJykuZ2V0SW1tZWRpYXRlKCk7XG4gICAgLy8gSW50ZXJuYWwgRklTIGluc3RhbmNlIHJlbGllcyBvbiBwdWJsaWMgRklTIGluc3RhbmNlLlxuICAgIGNvbnN0IGluc3RhbGxhdGlvbnMgPSBfZ2V0UHJvdmlkZXIoYXBwLCBJTlNUQUxMQVRJT05TX05BTUUpLmdldEltbWVkaWF0ZSgpO1xuICAgIGNvbnN0IGluc3RhbGxhdGlvbnNJbnRlcm5hbCA9IHtcbiAgICAgICAgZ2V0SWQ6ICgpID0+IGdldElkKGluc3RhbGxhdGlvbnMpLFxuICAgICAgICBnZXRUb2tlbjogKGZvcmNlUmVmcmVzaCkgPT4gZ2V0VG9rZW4oaW5zdGFsbGF0aW9ucywgZm9yY2VSZWZyZXNoKVxuICAgIH07XG4gICAgcmV0dXJuIGluc3RhbGxhdGlvbnNJbnRlcm5hbDtcbn07XG5mdW5jdGlvbiByZWdpc3Rlckluc3RhbGxhdGlvbnMoKSB7XG4gICAgX3JlZ2lzdGVyQ29tcG9uZW50KG5ldyBDb21wb25lbnQoSU5TVEFMTEFUSU9OU19OQU1FLCBwdWJsaWNGYWN0b3J5LCBcIlBVQkxJQ1wiIC8qIENvbXBvbmVudFR5cGUuUFVCTElDICovKSk7XG4gICAgX3JlZ2lzdGVyQ29tcG9uZW50KG5ldyBDb21wb25lbnQoSU5TVEFMTEFUSU9OU19OQU1FX0lOVEVSTkFMLCBpbnRlcm5hbEZhY3RvcnksIFwiUFJJVkFURVwiIC8qIENvbXBvbmVudFR5cGUuUFJJVkFURSAqLykpO1xufVxuXG4vKipcbiAqIFRoZSBGaXJlYmFzZSBJbnN0YWxsYXRpb25zIFdlYiBTREsuXG4gKiBUaGlzIFNESyBkb2VzIG5vdCB3b3JrIGluIGEgTm9kZS5qcyBlbnZpcm9ubWVudC5cbiAqXG4gKiBAcGFja2FnZURvY3VtZW50YXRpb25cbiAqL1xucmVnaXN0ZXJJbnN0YWxsYXRpb25zKCk7XG5yZWdpc3RlclZlcnNpb24obmFtZSwgdmVyc2lvbik7XG4vLyBCVUlMRF9UQVJHRVQgd2lsbCBiZSByZXBsYWNlZCBieSB2YWx1ZXMgbGlrZSBlc20sIGNqcywgZXRjIGR1cmluZyB0aGUgY29tcGlsYXRpb25cbnJlZ2lzdGVyVmVyc2lvbihuYW1lLCB2ZXJzaW9uLCAnZXNtMjAyMCcpO1xuXG5leHBvcnQgeyBkZWxldGVJbnN0YWxsYXRpb25zLCBnZXRJZCwgZ2V0SW5zdGFsbGF0aW9ucywgZ2V0VG9rZW4sIG9uSWRDaGFuZ2UgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmVzbS5qcy5tYXBcbiIsImltcG9ydCAnQGZpcmViYXNlL2luc3RhbGxhdGlvbnMnO1xuaW1wb3J0IHsgQ29tcG9uZW50IH0gZnJvbSAnQGZpcmViYXNlL2NvbXBvbmVudCc7XG5pbXBvcnQgeyBvcGVuREIsIGRlbGV0ZURCIH0gZnJvbSAnaWRiJztcbmltcG9ydCB7IEVycm9yRmFjdG9yeSwgaXNJbmRleGVkREJBdmFpbGFibGUsIHZhbGlkYXRlSW5kZXhlZERCT3BlbmFibGUsIGdldE1vZHVsYXJJbnN0YW5jZSB9IGZyb20gJ0BmaXJlYmFzZS91dGlsJztcbmltcG9ydCB7IF9yZWdpc3RlckNvbXBvbmVudCwgX2dldFByb3ZpZGVyLCBnZXRBcHAgfSBmcm9tICdAZmlyZWJhc2UvYXBwJztcblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmNvbnN0IERFRkFVTFRfVkFQSURfS0VZID0gJ0JET1U5OS1oNjdIY0E2SmVGWEhiU05NdTdlMnlOTnUzUnpvTWo4VE00Vzg4aklUZnE3Wm1QdklNMUl2LTRfbDJMeFFjWXdocWJ5MnhHcFd3empmQW5HNCc7XG5jb25zdCBFTkRQT0lOVCA9ICdodHRwczovL2ZjbXJlZ2lzdHJhdGlvbnMuZ29vZ2xlYXBpcy5jb20vdjEnO1xuLyoqIEtleSBvZiBGQ00gUGF5bG9hZCBpbiBOb3RpZmljYXRpb24ncyBkYXRhIGZpZWxkLiAqL1xuY29uc3QgRkNNX01TRyA9ICdGQ01fTVNHJztcbmNvbnN0IENPTlNPTEVfQ0FNUEFJR05fSUQgPSAnZ29vZ2xlLmMuYS5jX2lkJztcbi8vIERlZmluZWQgYXMgaW4gcHJvdG8vbWVzc2FnaW5nX2V2ZW50LnByb3RvLiBOZWdsZWN0aW5nIGZpZWxkcyB0aGF0IGFyZSBzdXBwb3J0ZWQuXG5jb25zdCBTREtfUExBVEZPUk1fV0VCID0gMztcbmNvbnN0IEVWRU5UX01FU1NBR0VfREVMSVZFUkVEID0gMTtcbnZhciBNZXNzYWdlVHlwZSQxO1xuKGZ1bmN0aW9uIChNZXNzYWdlVHlwZSkge1xuICAgIE1lc3NhZ2VUeXBlW01lc3NhZ2VUeXBlW1wiREFUQV9NRVNTQUdFXCJdID0gMV0gPSBcIkRBVEFfTUVTU0FHRVwiO1xuICAgIE1lc3NhZ2VUeXBlW01lc3NhZ2VUeXBlW1wiRElTUExBWV9OT1RJRklDQVRJT05cIl0gPSAzXSA9IFwiRElTUExBWV9OT1RJRklDQVRJT05cIjtcbn0pKE1lc3NhZ2VUeXBlJDEgfHwgKE1lc3NhZ2VUeXBlJDEgPSB7fSkpO1xuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHRcbiAqIGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZVxuICogaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3NcbiAqIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnMgdW5kZXJcbiAqIHRoZSBMaWNlbnNlLlxuICovXG52YXIgTWVzc2FnZVR5cGU7XG4oZnVuY3Rpb24gKE1lc3NhZ2VUeXBlKSB7XG4gICAgTWVzc2FnZVR5cGVbXCJQVVNIX1JFQ0VJVkVEXCJdID0gXCJwdXNoLXJlY2VpdmVkXCI7XG4gICAgTWVzc2FnZVR5cGVbXCJOT1RJRklDQVRJT05fQ0xJQ0tFRFwiXSA9IFwibm90aWZpY2F0aW9uLWNsaWNrZWRcIjtcbn0pKE1lc3NhZ2VUeXBlIHx8IChNZXNzYWdlVHlwZSA9IHt9KSk7XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5mdW5jdGlvbiBhcnJheVRvQmFzZTY0KGFycmF5KSB7XG4gICAgY29uc3QgdWludDhBcnJheSA9IG5ldyBVaW50OEFycmF5KGFycmF5KTtcbiAgICBjb25zdCBiYXNlNjRTdHJpbmcgPSBidG9hKFN0cmluZy5mcm9tQ2hhckNvZGUoLi4udWludDhBcnJheSkpO1xuICAgIHJldHVybiBiYXNlNjRTdHJpbmcucmVwbGFjZSgvPS9nLCAnJykucmVwbGFjZSgvXFwrL2csICctJykucmVwbGFjZSgvXFwvL2csICdfJyk7XG59XG5mdW5jdGlvbiBiYXNlNjRUb0FycmF5KGJhc2U2NFN0cmluZykge1xuICAgIGNvbnN0IHBhZGRpbmcgPSAnPScucmVwZWF0KCg0IC0gKGJhc2U2NFN0cmluZy5sZW5ndGggJSA0KSkgJSA0KTtcbiAgICBjb25zdCBiYXNlNjQgPSAoYmFzZTY0U3RyaW5nICsgcGFkZGluZylcbiAgICAgICAgLnJlcGxhY2UoL1xcLS9nLCAnKycpXG4gICAgICAgIC5yZXBsYWNlKC9fL2csICcvJyk7XG4gICAgY29uc3QgcmF3RGF0YSA9IGF0b2IoYmFzZTY0KTtcbiAgICBjb25zdCBvdXRwdXRBcnJheSA9IG5ldyBVaW50OEFycmF5KHJhd0RhdGEubGVuZ3RoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhd0RhdGEubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgb3V0cHV0QXJyYXlbaV0gPSByYXdEYXRhLmNoYXJDb2RlQXQoaSk7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXRBcnJheTtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmNvbnN0IE9MRF9EQl9OQU1FID0gJ2ZjbV90b2tlbl9kZXRhaWxzX2RiJztcbi8qKlxuICogVGhlIGxhc3QgREIgdmVyc2lvbiBvZiAnZmNtX3Rva2VuX2RldGFpbHNfZGInIHdhcyA0LiBUaGlzIGlzIG9uZSBoaWdoZXIsIHNvIHRoYXQgdGhlIHVwZ3JhZGVcbiAqIGNhbGxiYWNrIGlzIGNhbGxlZCBmb3IgYWxsIHZlcnNpb25zIG9mIHRoZSBvbGQgREIuXG4gKi9cbmNvbnN0IE9MRF9EQl9WRVJTSU9OID0gNTtcbmNvbnN0IE9MRF9PQkpFQ1RfU1RPUkVfTkFNRSA9ICdmY21fdG9rZW5fb2JqZWN0X1N0b3JlJztcbmFzeW5jIGZ1bmN0aW9uIG1pZ3JhdGVPbGREYXRhYmFzZShzZW5kZXJJZCkge1xuICAgIGlmICgnZGF0YWJhc2VzJyBpbiBpbmRleGVkREIpIHtcbiAgICAgICAgLy8gaW5kZXhlZERiLmRhdGFiYXNlcygpIGlzIGFuIEluZGV4ZWREQiB2MyBBUEkgYW5kIGRvZXMgbm90IGV4aXN0IGluIGFsbCBicm93c2Vycy4gVE9ETzogUmVtb3ZlXG4gICAgICAgIC8vIHR5cGVjYXN0IHdoZW4gaXQgbGFuZHMgaW4gVFMgdHlwZXMuXG4gICAgICAgIGNvbnN0IGRhdGFiYXNlcyA9IGF3YWl0IGluZGV4ZWREQi5kYXRhYmFzZXMoKTtcbiAgICAgICAgY29uc3QgZGJOYW1lcyA9IGRhdGFiYXNlcy5tYXAoZGIgPT4gZGIubmFtZSk7XG4gICAgICAgIGlmICghZGJOYW1lcy5pbmNsdWRlcyhPTERfREJfTkFNRSkpIHtcbiAgICAgICAgICAgIC8vIG9sZCBEQiBkaWRuJ3QgZXhpc3QsIG5vIG5lZWQgdG8gb3Blbi5cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCB0b2tlbkRldGFpbHMgPSBudWxsO1xuICAgIGNvbnN0IGRiID0gYXdhaXQgb3BlbkRCKE9MRF9EQl9OQU1FLCBPTERfREJfVkVSU0lPTiwge1xuICAgICAgICB1cGdyYWRlOiBhc3luYyAoZGIsIG9sZFZlcnNpb24sIG5ld1ZlcnNpb24sIHVwZ3JhZGVUcmFuc2FjdGlvbikgPT4ge1xuICAgICAgICAgICAgaWYgKG9sZFZlcnNpb24gPCAyKSB7XG4gICAgICAgICAgICAgICAgLy8gRGF0YWJhc2UgdG9vIG9sZCwgc2tpcCBtaWdyYXRpb24uXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFkYi5vYmplY3RTdG9yZU5hbWVzLmNvbnRhaW5zKE9MRF9PQkpFQ1RfU1RPUkVfTkFNRSkpIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRhYmFzZSBkaWQgbm90IGV4aXN0LiBOb3RoaW5nIHRvIGRvLlxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG9iamVjdFN0b3JlID0gdXBncmFkZVRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKE9MRF9PQkpFQ1RfU1RPUkVfTkFNRSk7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IG9iamVjdFN0b3JlLmluZGV4KCdmY21TZW5kZXJJZCcpLmdldChzZW5kZXJJZCk7XG4gICAgICAgICAgICBhd2FpdCBvYmplY3RTdG9yZS5jbGVhcigpO1xuICAgICAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIE5vIGVudHJ5IGluIHRoZSBkYXRhYmFzZSwgbm90aGluZyB0byBtaWdyYXRlLlxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvbGRWZXJzaW9uID09PSAyKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkRGV0YWlscyA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICghb2xkRGV0YWlscy5hdXRoIHx8ICFvbGREZXRhaWxzLnAyNTZkaCB8fCAhb2xkRGV0YWlscy5lbmRwb2ludCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRva2VuRGV0YWlscyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW46IG9sZERldGFpbHMuZmNtVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZVRpbWU6IG9sZERldGFpbHMuY3JlYXRlVGltZSA/PyBEYXRlLm5vdygpLFxuICAgICAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb25PcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdXRoOiBvbGREZXRhaWxzLmF1dGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwMjU2ZGg6IG9sZERldGFpbHMucDI1NmRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQ6IG9sZERldGFpbHMuZW5kcG9pbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBzd1Njb3BlOiBvbGREZXRhaWxzLnN3U2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXBpZEtleTogdHlwZW9mIG9sZERldGFpbHMudmFwaWRLZXkgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBvbGREZXRhaWxzLnZhcGlkS2V5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBhcnJheVRvQmFzZTY0KG9sZERldGFpbHMudmFwaWRLZXkpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAob2xkVmVyc2lvbiA9PT0gMykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZERldGFpbHMgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0b2tlbkRldGFpbHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuOiBvbGREZXRhaWxzLmZjbVRva2VuLFxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVUaW1lOiBvbGREZXRhaWxzLmNyZWF0ZVRpbWUsXG4gICAgICAgICAgICAgICAgICAgIHN1YnNjcmlwdGlvbk9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1dGg6IGFycmF5VG9CYXNlNjQob2xkRGV0YWlscy5hdXRoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHAyNTZkaDogYXJyYXlUb0Jhc2U2NChvbGREZXRhaWxzLnAyNTZkaCksXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogb2xkRGV0YWlscy5lbmRwb2ludCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3U2NvcGU6IG9sZERldGFpbHMuc3dTY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcGlkS2V5OiBhcnJheVRvQmFzZTY0KG9sZERldGFpbHMudmFwaWRLZXkpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAob2xkVmVyc2lvbiA9PT0gNCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZERldGFpbHMgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB0b2tlbkRldGFpbHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuOiBvbGREZXRhaWxzLmZjbVRva2VuLFxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVUaW1lOiBvbGREZXRhaWxzLmNyZWF0ZVRpbWUsXG4gICAgICAgICAgICAgICAgICAgIHN1YnNjcmlwdGlvbk9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1dGg6IGFycmF5VG9CYXNlNjQob2xkRGV0YWlscy5hdXRoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHAyNTZkaDogYXJyYXlUb0Jhc2U2NChvbGREZXRhaWxzLnAyNTZkaCksXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogb2xkRGV0YWlscy5lbmRwb2ludCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3U2NvcGU6IG9sZERldGFpbHMuc3dTY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcGlkS2V5OiBhcnJheVRvQmFzZTY0KG9sZERldGFpbHMudmFwaWRLZXkpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgZGIuY2xvc2UoKTtcbiAgICAvLyBEZWxldGUgYWxsIG9sZCBkYXRhYmFzZXMuXG4gICAgYXdhaXQgZGVsZXRlREIoT0xEX0RCX05BTUUpO1xuICAgIGF3YWl0IGRlbGV0ZURCKCdmY21fdmFwaWRfZGV0YWlsc19kYicpO1xuICAgIGF3YWl0IGRlbGV0ZURCKCd1bmRlZmluZWQnKTtcbiAgICByZXR1cm4gY2hlY2tUb2tlbkRldGFpbHModG9rZW5EZXRhaWxzKSA/IHRva2VuRGV0YWlscyA6IG51bGw7XG59XG5mdW5jdGlvbiBjaGVja1Rva2VuRGV0YWlscyh0b2tlbkRldGFpbHMpIHtcbiAgICBpZiAoIXRva2VuRGV0YWlscyB8fCAhdG9rZW5EZXRhaWxzLnN1YnNjcmlwdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCB7IHN1YnNjcmlwdGlvbk9wdGlvbnMgfSA9IHRva2VuRGV0YWlscztcbiAgICByZXR1cm4gKHR5cGVvZiB0b2tlbkRldGFpbHMuY3JlYXRlVGltZSA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgdG9rZW5EZXRhaWxzLmNyZWF0ZVRpbWUgPiAwICYmXG4gICAgICAgIHR5cGVvZiB0b2tlbkRldGFpbHMudG9rZW4gPT09ICdzdHJpbmcnICYmXG4gICAgICAgIHRva2VuRGV0YWlscy50b2tlbi5sZW5ndGggPiAwICYmXG4gICAgICAgIHR5cGVvZiBzdWJzY3JpcHRpb25PcHRpb25zLmF1dGggPT09ICdzdHJpbmcnICYmXG4gICAgICAgIHN1YnNjcmlwdGlvbk9wdGlvbnMuYXV0aC5sZW5ndGggPiAwICYmXG4gICAgICAgIHR5cGVvZiBzdWJzY3JpcHRpb25PcHRpb25zLnAyNTZkaCA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgc3Vic2NyaXB0aW9uT3B0aW9ucy5wMjU2ZGgubGVuZ3RoID4gMCAmJlxuICAgICAgICB0eXBlb2Ygc3Vic2NyaXB0aW9uT3B0aW9ucy5lbmRwb2ludCA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgc3Vic2NyaXB0aW9uT3B0aW9ucy5lbmRwb2ludC5sZW5ndGggPiAwICYmXG4gICAgICAgIHR5cGVvZiBzdWJzY3JpcHRpb25PcHRpb25zLnN3U2NvcGUgPT09ICdzdHJpbmcnICYmXG4gICAgICAgIHN1YnNjcmlwdGlvbk9wdGlvbnMuc3dTY29wZS5sZW5ndGggPiAwICYmXG4gICAgICAgIHR5cGVvZiBzdWJzY3JpcHRpb25PcHRpb25zLnZhcGlkS2V5ID09PSAnc3RyaW5nJyAmJlxuICAgICAgICBzdWJzY3JpcHRpb25PcHRpb25zLnZhcGlkS2V5Lmxlbmd0aCA+IDApO1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLy8gRXhwb3J0ZWQgZm9yIHRlc3RzLlxuY29uc3QgREFUQUJBU0VfTkFNRSA9ICdmaXJlYmFzZS1tZXNzYWdpbmctZGF0YWJhc2UnO1xuY29uc3QgREFUQUJBU0VfVkVSU0lPTiA9IDE7XG5jb25zdCBPQkpFQ1RfU1RPUkVfTkFNRSA9ICdmaXJlYmFzZS1tZXNzYWdpbmctc3RvcmUnO1xubGV0IGRiUHJvbWlzZSA9IG51bGw7XG5mdW5jdGlvbiBnZXREYlByb21pc2UoKSB7XG4gICAgaWYgKCFkYlByb21pc2UpIHtcbiAgICAgICAgZGJQcm9taXNlID0gb3BlbkRCKERBVEFCQVNFX05BTUUsIERBVEFCQVNFX1ZFUlNJT04sIHtcbiAgICAgICAgICAgIHVwZ3JhZGU6ICh1cGdyYWRlRGIsIG9sZFZlcnNpb24pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBXZSBkb24ndCB1c2UgJ2JyZWFrJyBpbiB0aGlzIHN3aXRjaCBzdGF0ZW1lbnQsIHRoZSBmYWxsLXRocm91Z2ggYmVoYXZpb3IgaXMgd2hhdCB3ZSB3YW50LFxuICAgICAgICAgICAgICAgIC8vIGJlY2F1c2UgaWYgdGhlcmUgYXJlIG11bHRpcGxlIHZlcnNpb25zIGJldHdlZW4gdGhlIG9sZCB2ZXJzaW9uIGFuZCB0aGUgY3VycmVudCB2ZXJzaW9uLCB3ZVxuICAgICAgICAgICAgICAgIC8vIHdhbnQgQUxMIHRoZSBtaWdyYXRpb25zIHRoYXQgY29ycmVzcG9uZCB0byB0aG9zZSB2ZXJzaW9ucyB0byBydW4sIG5vdCBvbmx5IHRoZSBsYXN0IG9uZS5cbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZGVmYXVsdC1jYXNlXG4gICAgICAgICAgICAgICAgc3dpdGNoIChvbGRWZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZ3JhZGVEYi5jcmVhdGVPYmplY3RTdG9yZShPQkpFQ1RfU1RPUkVfTkFNRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGRiUHJvbWlzZTtcbn1cbi8qKiBHZXRzIHJlY29yZChzKSBmcm9tIHRoZSBvYmplY3RTdG9yZSB0aGF0IG1hdGNoIHRoZSBnaXZlbiBrZXkuICovXG5hc3luYyBmdW5jdGlvbiBkYkdldChmaXJlYmFzZURlcGVuZGVuY2llcykge1xuICAgIGNvbnN0IGtleSA9IGdldEtleShmaXJlYmFzZURlcGVuZGVuY2llcyk7XG4gICAgY29uc3QgZGIgPSBhd2FpdCBnZXREYlByb21pc2UoKTtcbiAgICBjb25zdCB0b2tlbkRldGFpbHMgPSAoYXdhaXQgZGJcbiAgICAgICAgLnRyYW5zYWN0aW9uKE9CSkVDVF9TVE9SRV9OQU1FKVxuICAgICAgICAub2JqZWN0U3RvcmUoT0JKRUNUX1NUT1JFX05BTUUpXG4gICAgICAgIC5nZXQoa2V5KSk7XG4gICAgaWYgKHRva2VuRGV0YWlscykge1xuICAgICAgICByZXR1cm4gdG9rZW5EZXRhaWxzO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgYSB0b2tlbkRldGFpbHMgb2JqZWN0IGluIHRoZSBvbGQgREIuXG4gICAgICAgIGNvbnN0IG9sZFRva2VuRGV0YWlscyA9IGF3YWl0IG1pZ3JhdGVPbGREYXRhYmFzZShmaXJlYmFzZURlcGVuZGVuY2llcy5hcHBDb25maWcuc2VuZGVySWQpO1xuICAgICAgICBpZiAob2xkVG9rZW5EZXRhaWxzKSB7XG4gICAgICAgICAgICBhd2FpdCBkYlNldChmaXJlYmFzZURlcGVuZGVuY2llcywgb2xkVG9rZW5EZXRhaWxzKTtcbiAgICAgICAgICAgIHJldHVybiBvbGRUb2tlbkRldGFpbHM7XG4gICAgICAgIH1cbiAgICB9XG59XG4vKiogQXNzaWducyBvciBvdmVyd3JpdGVzIHRoZSByZWNvcmQgZm9yIHRoZSBnaXZlbiBrZXkgd2l0aCB0aGUgZ2l2ZW4gdmFsdWUuICovXG5hc3luYyBmdW5jdGlvbiBkYlNldChmaXJlYmFzZURlcGVuZGVuY2llcywgdG9rZW5EZXRhaWxzKSB7XG4gICAgY29uc3Qga2V5ID0gZ2V0S2V5KGZpcmViYXNlRGVwZW5kZW5jaWVzKTtcbiAgICBjb25zdCBkYiA9IGF3YWl0IGdldERiUHJvbWlzZSgpO1xuICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oT0JKRUNUX1NUT1JFX05BTUUsICdyZWFkd3JpdGUnKTtcbiAgICBhd2FpdCB0eC5vYmplY3RTdG9yZShPQkpFQ1RfU1RPUkVfTkFNRSkucHV0KHRva2VuRGV0YWlscywga2V5KTtcbiAgICBhd2FpdCB0eC5kb25lO1xuICAgIHJldHVybiB0b2tlbkRldGFpbHM7XG59XG4vKiogUmVtb3ZlcyByZWNvcmQocykgZnJvbSB0aGUgb2JqZWN0U3RvcmUgdGhhdCBtYXRjaCB0aGUgZ2l2ZW4ga2V5LiAqL1xuYXN5bmMgZnVuY3Rpb24gZGJSZW1vdmUoZmlyZWJhc2VEZXBlbmRlbmNpZXMpIHtcbiAgICBjb25zdCBrZXkgPSBnZXRLZXkoZmlyZWJhc2VEZXBlbmRlbmNpZXMpO1xuICAgIGNvbnN0IGRiID0gYXdhaXQgZ2V0RGJQcm9taXNlKCk7XG4gICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihPQkpFQ1RfU1RPUkVfTkFNRSwgJ3JlYWR3cml0ZScpO1xuICAgIGF3YWl0IHR4Lm9iamVjdFN0b3JlKE9CSkVDVF9TVE9SRV9OQU1FKS5kZWxldGUoa2V5KTtcbiAgICBhd2FpdCB0eC5kb25lO1xufVxuZnVuY3Rpb24gZ2V0S2V5KHsgYXBwQ29uZmlnIH0pIHtcbiAgICByZXR1cm4gYXBwQ29uZmlnLmFwcElkO1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuY29uc3QgRVJST1JfTUFQID0ge1xuICAgIFtcIm1pc3NpbmctYXBwLWNvbmZpZy12YWx1ZXNcIiAvKiBFcnJvckNvZGUuTUlTU0lOR19BUFBfQ09ORklHX1ZBTFVFUyAqL106ICdNaXNzaW5nIEFwcCBjb25maWd1cmF0aW9uIHZhbHVlOiBcInskdmFsdWVOYW1lfVwiJyxcbiAgICBbXCJvbmx5LWF2YWlsYWJsZS1pbi13aW5kb3dcIiAvKiBFcnJvckNvZGUuQVZBSUxBQkxFX0lOX1dJTkRPVyAqL106ICdUaGlzIG1ldGhvZCBpcyBhdmFpbGFibGUgaW4gYSBXaW5kb3cgY29udGV4dC4nLFxuICAgIFtcIm9ubHktYXZhaWxhYmxlLWluLXN3XCIgLyogRXJyb3JDb2RlLkFWQUlMQUJMRV9JTl9TVyAqL106ICdUaGlzIG1ldGhvZCBpcyBhdmFpbGFibGUgaW4gYSBzZXJ2aWNlIHdvcmtlciBjb250ZXh0LicsXG4gICAgW1wicGVybWlzc2lvbi1kZWZhdWx0XCIgLyogRXJyb3JDb2RlLlBFUk1JU1NJT05fREVGQVVMVCAqL106ICdUaGUgbm90aWZpY2F0aW9uIHBlcm1pc3Npb24gd2FzIG5vdCBncmFudGVkIGFuZCBkaXNtaXNzZWQgaW5zdGVhZC4nLFxuICAgIFtcInBlcm1pc3Npb24tYmxvY2tlZFwiIC8qIEVycm9yQ29kZS5QRVJNSVNTSU9OX0JMT0NLRUQgKi9dOiAnVGhlIG5vdGlmaWNhdGlvbiBwZXJtaXNzaW9uIHdhcyBub3QgZ3JhbnRlZCBhbmQgYmxvY2tlZCBpbnN0ZWFkLicsXG4gICAgW1widW5zdXBwb3J0ZWQtYnJvd3NlclwiIC8qIEVycm9yQ29kZS5VTlNVUFBPUlRFRF9CUk9XU0VSICovXTogXCJUaGlzIGJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IHRoZSBBUEkncyByZXF1aXJlZCB0byB1c2UgdGhlIEZpcmViYXNlIFNESy5cIixcbiAgICBbXCJpbmRleGVkLWRiLXVuc3VwcG9ydGVkXCIgLyogRXJyb3JDb2RlLklOREVYRURfREJfVU5TVVBQT1JURUQgKi9dOiBcIlRoaXMgYnJvd3NlciBkb2Vzbid0IHN1cHBvcnQgaW5kZXhlZERiLm9wZW4oKSAoZXguIFNhZmFyaSBpRnJhbWUsIEZpcmVmb3ggUHJpdmF0ZSBCcm93c2luZywgZXRjKVwiLFxuICAgIFtcImZhaWxlZC1zZXJ2aWNlLXdvcmtlci1yZWdpc3RyYXRpb25cIiAvKiBFcnJvckNvZGUuRkFJTEVEX0RFRkFVTFRfUkVHSVNUUkFUSU9OICovXTogJ1dlIGFyZSB1bmFibGUgdG8gcmVnaXN0ZXIgdGhlIGRlZmF1bHQgc2VydmljZSB3b3JrZXIuIHskYnJvd3NlckVycm9yTWVzc2FnZX0nLFxuICAgIFtcInRva2VuLXN1YnNjcmliZS1mYWlsZWRcIiAvKiBFcnJvckNvZGUuVE9LRU5fU1VCU0NSSUJFX0ZBSUxFRCAqL106ICdBIHByb2JsZW0gb2NjdXJyZWQgd2hpbGUgc3Vic2NyaWJpbmcgdGhlIHVzZXIgdG8gRkNNOiB7JGVycm9ySW5mb30nLFxuICAgIFtcInRva2VuLXN1YnNjcmliZS1uby10b2tlblwiIC8qIEVycm9yQ29kZS5UT0tFTl9TVUJTQ1JJQkVfTk9fVE9LRU4gKi9dOiAnRkNNIHJldHVybmVkIG5vIHRva2VuIHdoZW4gc3Vic2NyaWJpbmcgdGhlIHVzZXIgdG8gcHVzaC4nLFxuICAgIFtcInRva2VuLXVuc3Vic2NyaWJlLWZhaWxlZFwiIC8qIEVycm9yQ29kZS5UT0tFTl9VTlNVQlNDUklCRV9GQUlMRUQgKi9dOiAnQSBwcm9ibGVtIG9jY3VycmVkIHdoaWxlIHVuc3Vic2NyaWJpbmcgdGhlICcgK1xuICAgICAgICAndXNlciBmcm9tIEZDTTogeyRlcnJvckluZm99JyxcbiAgICBbXCJ0b2tlbi11cGRhdGUtZmFpbGVkXCIgLyogRXJyb3JDb2RlLlRPS0VOX1VQREFURV9GQUlMRUQgKi9dOiAnQSBwcm9ibGVtIG9jY3VycmVkIHdoaWxlIHVwZGF0aW5nIHRoZSB1c2VyIGZyb20gRkNNOiB7JGVycm9ySW5mb30nLFxuICAgIFtcInRva2VuLXVwZGF0ZS1uby10b2tlblwiIC8qIEVycm9yQ29kZS5UT0tFTl9VUERBVEVfTk9fVE9LRU4gKi9dOiAnRkNNIHJldHVybmVkIG5vIHRva2VuIHdoZW4gdXBkYXRpbmcgdGhlIHVzZXIgdG8gcHVzaC4nLFxuICAgIFtcInVzZS1zdy1hZnRlci1nZXQtdG9rZW5cIiAvKiBFcnJvckNvZGUuVVNFX1NXX0FGVEVSX0dFVF9UT0tFTiAqL106ICdUaGUgdXNlU2VydmljZVdvcmtlcigpIG1ldGhvZCBtYXkgb25seSBiZSBjYWxsZWQgb25jZSBhbmQgbXVzdCBiZSAnICtcbiAgICAgICAgJ2NhbGxlZCBiZWZvcmUgY2FsbGluZyBnZXRUb2tlbigpIHRvIGVuc3VyZSB5b3VyIHNlcnZpY2Ugd29ya2VyIGlzIHVzZWQuJyxcbiAgICBbXCJpbnZhbGlkLXN3LXJlZ2lzdHJhdGlvblwiIC8qIEVycm9yQ29kZS5JTlZBTElEX1NXX1JFR0lTVFJBVElPTiAqL106ICdUaGUgaW5wdXQgdG8gdXNlU2VydmljZVdvcmtlcigpIG11c3QgYmUgYSBTZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uLicsXG4gICAgW1wiaW52YWxpZC1iZy1oYW5kbGVyXCIgLyogRXJyb3JDb2RlLklOVkFMSURfQkdfSEFORExFUiAqL106ICdUaGUgaW5wdXQgdG8gc2V0QmFja2dyb3VuZE1lc3NhZ2VIYW5kbGVyKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLicsXG4gICAgW1wiaW52YWxpZC12YXBpZC1rZXlcIiAvKiBFcnJvckNvZGUuSU5WQUxJRF9WQVBJRF9LRVkgKi9dOiAnVGhlIHB1YmxpYyBWQVBJRCBrZXkgbXVzdCBiZSBhIHN0cmluZy4nLFxuICAgIFtcInVzZS12YXBpZC1rZXktYWZ0ZXItZ2V0LXRva2VuXCIgLyogRXJyb3JDb2RlLlVTRV9WQVBJRF9LRVlfQUZURVJfR0VUX1RPS0VOICovXTogJ1RoZSB1c2VQdWJsaWNWYXBpZEtleSgpIG1ldGhvZCBtYXkgb25seSBiZSBjYWxsZWQgb25jZSBhbmQgbXVzdCBiZSAnICtcbiAgICAgICAgJ2NhbGxlZCBiZWZvcmUgY2FsbGluZyBnZXRUb2tlbigpIHRvIGVuc3VyZSB5b3VyIFZBUElEIGtleSBpcyB1c2VkLidcbn07XG5jb25zdCBFUlJPUl9GQUNUT1JZID0gbmV3IEVycm9yRmFjdG9yeSgnbWVzc2FnaW5nJywgJ01lc3NhZ2luZycsIEVSUk9SX01BUCk7XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5hc3luYyBmdW5jdGlvbiByZXF1ZXN0R2V0VG9rZW4oZmlyZWJhc2VEZXBlbmRlbmNpZXMsIHN1YnNjcmlwdGlvbk9wdGlvbnMpIHtcbiAgICBjb25zdCBoZWFkZXJzID0gYXdhaXQgZ2V0SGVhZGVycyhmaXJlYmFzZURlcGVuZGVuY2llcyk7XG4gICAgY29uc3QgYm9keSA9IGdldEJvZHkoc3Vic2NyaXB0aW9uT3B0aW9ucyk7XG4gICAgY29uc3Qgc3Vic2NyaWJlT3B0aW9ucyA9IHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpXG4gICAgfTtcbiAgICBsZXQgcmVzcG9uc2VEYXRhO1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goZ2V0RW5kcG9pbnQoZmlyZWJhc2VEZXBlbmRlbmNpZXMuYXBwQ29uZmlnKSwgc3Vic2NyaWJlT3B0aW9ucyk7XG4gICAgICAgIHJlc3BvbnNlRGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcInRva2VuLXN1YnNjcmliZS1mYWlsZWRcIiAvKiBFcnJvckNvZGUuVE9LRU5fU1VCU0NSSUJFX0ZBSUxFRCAqLywge1xuICAgICAgICAgICAgZXJyb3JJbmZvOiBlcnI/LnRvU3RyaW5nKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChyZXNwb25zZURhdGEuZXJyb3IpIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IHJlc3BvbnNlRGF0YS5lcnJvci5tZXNzYWdlO1xuICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcInRva2VuLXN1YnNjcmliZS1mYWlsZWRcIiAvKiBFcnJvckNvZGUuVE9LRU5fU1VCU0NSSUJFX0ZBSUxFRCAqLywge1xuICAgICAgICAgICAgZXJyb3JJbmZvOiBtZXNzYWdlXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoIXJlc3BvbnNlRGF0YS50b2tlbikge1xuICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcInRva2VuLXN1YnNjcmliZS1uby10b2tlblwiIC8qIEVycm9yQ29kZS5UT0tFTl9TVUJTQ1JJQkVfTk9fVE9LRU4gKi8pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzcG9uc2VEYXRhLnRva2VuO1xufVxuYXN5bmMgZnVuY3Rpb24gcmVxdWVzdFVwZGF0ZVRva2VuKGZpcmViYXNlRGVwZW5kZW5jaWVzLCB0b2tlbkRldGFpbHMpIHtcbiAgICBjb25zdCBoZWFkZXJzID0gYXdhaXQgZ2V0SGVhZGVycyhmaXJlYmFzZURlcGVuZGVuY2llcyk7XG4gICAgY29uc3QgYm9keSA9IGdldEJvZHkodG9rZW5EZXRhaWxzLnN1YnNjcmlwdGlvbk9wdGlvbnMpO1xuICAgIGNvbnN0IHVwZGF0ZU9wdGlvbnMgPSB7XG4gICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgaGVhZGVycyxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSlcbiAgICB9O1xuICAgIGxldCByZXNwb25zZURhdGE7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtnZXRFbmRwb2ludChmaXJlYmFzZURlcGVuZGVuY2llcy5hcHBDb25maWcpfS8ke3Rva2VuRGV0YWlscy50b2tlbn1gLCB1cGRhdGVPcHRpb25zKTtcbiAgICAgICAgcmVzcG9uc2VEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwidG9rZW4tdXBkYXRlLWZhaWxlZFwiIC8qIEVycm9yQ29kZS5UT0tFTl9VUERBVEVfRkFJTEVEICovLCB7XG4gICAgICAgICAgICBlcnJvckluZm86IGVycj8udG9TdHJpbmcoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYgKHJlc3BvbnNlRGF0YS5lcnJvcikge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gcmVzcG9uc2VEYXRhLmVycm9yLm1lc3NhZ2U7XG4gICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwidG9rZW4tdXBkYXRlLWZhaWxlZFwiIC8qIEVycm9yQ29kZS5UT0tFTl9VUERBVEVfRkFJTEVEICovLCB7XG4gICAgICAgICAgICBlcnJvckluZm86IG1lc3NhZ2VcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmICghcmVzcG9uc2VEYXRhLnRva2VuKSB7XG4gICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwidG9rZW4tdXBkYXRlLW5vLXRva2VuXCIgLyogRXJyb3JDb2RlLlRPS0VOX1VQREFURV9OT19UT0tFTiAqLyk7XG4gICAgfVxuICAgIHJldHVybiByZXNwb25zZURhdGEudG9rZW47XG59XG5hc3luYyBmdW5jdGlvbiByZXF1ZXN0RGVsZXRlVG9rZW4oZmlyZWJhc2VEZXBlbmRlbmNpZXMsIHRva2VuKSB7XG4gICAgY29uc3QgaGVhZGVycyA9IGF3YWl0IGdldEhlYWRlcnMoZmlyZWJhc2VEZXBlbmRlbmNpZXMpO1xuICAgIGNvbnN0IHVuc3Vic2NyaWJlT3B0aW9ucyA9IHtcbiAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgaGVhZGVyc1xuICAgIH07XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtnZXRFbmRwb2ludChmaXJlYmFzZURlcGVuZGVuY2llcy5hcHBDb25maWcpfS8ke3Rva2VufWAsIHVuc3Vic2NyaWJlT3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlRGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlRGF0YS5lcnJvcikge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHJlc3BvbnNlRGF0YS5lcnJvci5tZXNzYWdlO1xuICAgICAgICAgICAgdGhyb3cgRVJST1JfRkFDVE9SWS5jcmVhdGUoXCJ0b2tlbi11bnN1YnNjcmliZS1mYWlsZWRcIiAvKiBFcnJvckNvZGUuVE9LRU5fVU5TVUJTQ1JJQkVfRkFJTEVEICovLCB7XG4gICAgICAgICAgICAgICAgZXJyb3JJbmZvOiBtZXNzYWdlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwidG9rZW4tdW5zdWJzY3JpYmUtZmFpbGVkXCIgLyogRXJyb3JDb2RlLlRPS0VOX1VOU1VCU0NSSUJFX0ZBSUxFRCAqLywge1xuICAgICAgICAgICAgZXJyb3JJbmZvOiBlcnI/LnRvU3RyaW5nKClcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZnVuY3Rpb24gZ2V0RW5kcG9pbnQoeyBwcm9qZWN0SWQgfSkge1xuICAgIHJldHVybiBgJHtFTkRQT0lOVH0vcHJvamVjdHMvJHtwcm9qZWN0SWR9L3JlZ2lzdHJhdGlvbnNgO1xufVxuYXN5bmMgZnVuY3Rpb24gZ2V0SGVhZGVycyh7IGFwcENvbmZpZywgaW5zdGFsbGF0aW9ucyB9KSB7XG4gICAgY29uc3QgYXV0aFRva2VuID0gYXdhaXQgaW5zdGFsbGF0aW9ucy5nZXRUb2tlbigpO1xuICAgIHJldHVybiBuZXcgSGVhZGVycyh7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIEFjY2VwdDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAneC1nb29nLWFwaS1rZXknOiBhcHBDb25maWcuYXBpS2V5LFxuICAgICAgICAneC1nb29nLWZpcmViYXNlLWluc3RhbGxhdGlvbnMtYXV0aCc6IGBGSVMgJHthdXRoVG9rZW59YFxuICAgIH0pO1xufVxuZnVuY3Rpb24gZ2V0Qm9keSh7IHAyNTZkaCwgYXV0aCwgZW5kcG9pbnQsIHZhcGlkS2V5IH0pIHtcbiAgICBjb25zdCBib2R5ID0ge1xuICAgICAgICB3ZWI6IHtcbiAgICAgICAgICAgIGVuZHBvaW50LFxuICAgICAgICAgICAgYXV0aCxcbiAgICAgICAgICAgIHAyNTZkaFxuICAgICAgICB9XG4gICAgfTtcbiAgICBpZiAodmFwaWRLZXkgIT09IERFRkFVTFRfVkFQSURfS0VZKSB7XG4gICAgICAgIGJvZHkud2ViLmFwcGxpY2F0aW9uUHViS2V5ID0gdmFwaWRLZXk7XG4gICAgfVxuICAgIHJldHVybiBib2R5O1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLy8gVXBkYXRlUmVnaXN0cmF0aW9uIHdpbGwgYmUgY2FsbGVkIG9uY2UgZXZlcnkgd2Vlay5cbmNvbnN0IFRPS0VOX0VYUElSQVRJT05fTVMgPSA3ICogMjQgKiA2MCAqIDYwICogMTAwMDsgLy8gNyBkYXlzXG5hc3luYyBmdW5jdGlvbiBnZXRUb2tlbkludGVybmFsKG1lc3NhZ2luZykge1xuICAgIGNvbnN0IHB1c2hTdWJzY3JpcHRpb24gPSBhd2FpdCBnZXRQdXNoU3Vic2NyaXB0aW9uKG1lc3NhZ2luZy5zd1JlZ2lzdHJhdGlvbiwgbWVzc2FnaW5nLnZhcGlkS2V5KTtcbiAgICBjb25zdCBzdWJzY3JpcHRpb25PcHRpb25zID0ge1xuICAgICAgICB2YXBpZEtleTogbWVzc2FnaW5nLnZhcGlkS2V5LFxuICAgICAgICBzd1Njb3BlOiBtZXNzYWdpbmcuc3dSZWdpc3RyYXRpb24uc2NvcGUsXG4gICAgICAgIGVuZHBvaW50OiBwdXNoU3Vic2NyaXB0aW9uLmVuZHBvaW50LFxuICAgICAgICBhdXRoOiBhcnJheVRvQmFzZTY0KHB1c2hTdWJzY3JpcHRpb24uZ2V0S2V5KCdhdXRoJykpLFxuICAgICAgICBwMjU2ZGg6IGFycmF5VG9CYXNlNjQocHVzaFN1YnNjcmlwdGlvbi5nZXRLZXkoJ3AyNTZkaCcpKVxuICAgIH07XG4gICAgY29uc3QgdG9rZW5EZXRhaWxzID0gYXdhaXQgZGJHZXQobWVzc2FnaW5nLmZpcmViYXNlRGVwZW5kZW5jaWVzKTtcbiAgICBpZiAoIXRva2VuRGV0YWlscykge1xuICAgICAgICAvLyBObyB0b2tlbiwgZ2V0IGEgbmV3IG9uZS5cbiAgICAgICAgcmV0dXJuIGdldE5ld1Rva2VuKG1lc3NhZ2luZy5maXJlYmFzZURlcGVuZGVuY2llcywgc3Vic2NyaXB0aW9uT3B0aW9ucyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKCFpc1Rva2VuVmFsaWQodG9rZW5EZXRhaWxzLnN1YnNjcmlwdGlvbk9wdGlvbnMsIHN1YnNjcmlwdGlvbk9wdGlvbnMpKSB7XG4gICAgICAgIC8vIEludmFsaWQgdG9rZW4sIGdldCBhIG5ldyBvbmUuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCByZXF1ZXN0RGVsZXRlVG9rZW4obWVzc2FnaW5nLmZpcmViYXNlRGVwZW5kZW5jaWVzLCB0b2tlbkRldGFpbHMudG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBTdXBwcmVzcyBlcnJvcnMgYmVjYXVzZSBvZiAjMjM2NFxuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBnZXROZXdUb2tlbihtZXNzYWdpbmcuZmlyZWJhc2VEZXBlbmRlbmNpZXMsIHN1YnNjcmlwdGlvbk9wdGlvbnMpO1xuICAgIH1cbiAgICBlbHNlIGlmIChEYXRlLm5vdygpID49IHRva2VuRGV0YWlscy5jcmVhdGVUaW1lICsgVE9LRU5fRVhQSVJBVElPTl9NUykge1xuICAgICAgICAvLyBXZWVrbHkgdG9rZW4gcmVmcmVzaFxuICAgICAgICByZXR1cm4gdXBkYXRlVG9rZW4obWVzc2FnaW5nLCB7XG4gICAgICAgICAgICB0b2tlbjogdG9rZW5EZXRhaWxzLnRva2VuLFxuICAgICAgICAgICAgY3JlYXRlVGltZTogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbk9wdGlvbnNcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyBWYWxpZCB0b2tlbiwgbm90aGluZyB0byBkby5cbiAgICAgICAgcmV0dXJuIHRva2VuRGV0YWlscy50b2tlbjtcbiAgICB9XG59XG4vKipcbiAqIFRoaXMgbWV0aG9kIGRlbGV0ZXMgdGhlIHRva2VuIGZyb20gdGhlIGRhdGFiYXNlLCB1bnN1YnNjcmliZXMgdGhlIHRva2VuIGZyb20gRkNNLCBhbmQgdW5yZWdpc3RlcnNcbiAqIHRoZSBwdXNoIHN1YnNjcmlwdGlvbiBpZiBpdCBleGlzdHMuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGRlbGV0ZVRva2VuSW50ZXJuYWwobWVzc2FnaW5nKSB7XG4gICAgY29uc3QgdG9rZW5EZXRhaWxzID0gYXdhaXQgZGJHZXQobWVzc2FnaW5nLmZpcmViYXNlRGVwZW5kZW5jaWVzKTtcbiAgICBpZiAodG9rZW5EZXRhaWxzKSB7XG4gICAgICAgIGF3YWl0IHJlcXVlc3REZWxldGVUb2tlbihtZXNzYWdpbmcuZmlyZWJhc2VEZXBlbmRlbmNpZXMsIHRva2VuRGV0YWlscy50b2tlbik7XG4gICAgICAgIGF3YWl0IGRiUmVtb3ZlKG1lc3NhZ2luZy5maXJlYmFzZURlcGVuZGVuY2llcyk7XG4gICAgfVxuICAgIC8vIFVuc3Vic2NyaWJlIGZyb20gdGhlIHB1c2ggc3Vic2NyaXB0aW9uLlxuICAgIGNvbnN0IHB1c2hTdWJzY3JpcHRpb24gPSBhd2FpdCBtZXNzYWdpbmcuc3dSZWdpc3RyYXRpb24ucHVzaE1hbmFnZXIuZ2V0U3Vic2NyaXB0aW9uKCk7XG4gICAgaWYgKHB1c2hTdWJzY3JpcHRpb24pIHtcbiAgICAgICAgcmV0dXJuIHB1c2hTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gICAgLy8gSWYgdGhlcmUncyBubyBTVywgY29uc2lkZXIgaXQgYSBzdWNjZXNzLlxuICAgIHJldHVybiB0cnVlO1xufVxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlVG9rZW4obWVzc2FnaW5nLCB0b2tlbkRldGFpbHMpIHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCB1cGRhdGVkVG9rZW4gPSBhd2FpdCByZXF1ZXN0VXBkYXRlVG9rZW4obWVzc2FnaW5nLmZpcmViYXNlRGVwZW5kZW5jaWVzLCB0b2tlbkRldGFpbHMpO1xuICAgICAgICBjb25zdCB1cGRhdGVkVG9rZW5EZXRhaWxzID0ge1xuICAgICAgICAgICAgLi4udG9rZW5EZXRhaWxzLFxuICAgICAgICAgICAgdG9rZW46IHVwZGF0ZWRUb2tlbixcbiAgICAgICAgICAgIGNyZWF0ZVRpbWU6IERhdGUubm93KClcbiAgICAgICAgfTtcbiAgICAgICAgYXdhaXQgZGJTZXQobWVzc2FnaW5nLmZpcmViYXNlRGVwZW5kZW5jaWVzLCB1cGRhdGVkVG9rZW5EZXRhaWxzKTtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZWRUb2tlbjtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICB9XG59XG5hc3luYyBmdW5jdGlvbiBnZXROZXdUb2tlbihmaXJlYmFzZURlcGVuZGVuY2llcywgc3Vic2NyaXB0aW9uT3B0aW9ucykge1xuICAgIGNvbnN0IHRva2VuID0gYXdhaXQgcmVxdWVzdEdldFRva2VuKGZpcmViYXNlRGVwZW5kZW5jaWVzLCBzdWJzY3JpcHRpb25PcHRpb25zKTtcbiAgICBjb25zdCB0b2tlbkRldGFpbHMgPSB7XG4gICAgICAgIHRva2VuLFxuICAgICAgICBjcmVhdGVUaW1lOiBEYXRlLm5vdygpLFxuICAgICAgICBzdWJzY3JpcHRpb25PcHRpb25zXG4gICAgfTtcbiAgICBhd2FpdCBkYlNldChmaXJlYmFzZURlcGVuZGVuY2llcywgdG9rZW5EZXRhaWxzKTtcbiAgICByZXR1cm4gdG9rZW5EZXRhaWxzLnRva2VuO1xufVxuLyoqXG4gKiBHZXRzIGEgUHVzaFN1YnNjcmlwdGlvbiBmb3IgdGhlIGN1cnJlbnQgdXNlci5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0UHVzaFN1YnNjcmlwdGlvbihzd1JlZ2lzdHJhdGlvbiwgdmFwaWRLZXkpIHtcbiAgICBjb25zdCBzdWJzY3JpcHRpb24gPSBhd2FpdCBzd1JlZ2lzdHJhdGlvbi5wdXNoTWFuYWdlci5nZXRTdWJzY3JpcHRpb24oKTtcbiAgICBpZiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfVxuICAgIHJldHVybiBzd1JlZ2lzdHJhdGlvbi5wdXNoTWFuYWdlci5zdWJzY3JpYmUoe1xuICAgICAgICB1c2VyVmlzaWJsZU9ubHk6IHRydWUsXG4gICAgICAgIC8vIENocm9tZSA8PSA3NSBkb2Vzbid0IHN1cHBvcnQgYmFzZTY0LWVuY29kZWQgVkFQSUQga2V5LiBGb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSwgVkFQSUQga2V5XG4gICAgICAgIC8vIHN1Ym1pdHRlZCB0byBwdXNoTWFuYWdlciNzdWJzY3JpYmUgbXVzdCBiZSBvZiB0eXBlIFVpbnQ4QXJyYXkuXG4gICAgICAgIGFwcGxpY2F0aW9uU2VydmVyS2V5OiBiYXNlNjRUb0FycmF5KHZhcGlkS2V5KVxuICAgIH0pO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIHNhdmVkIHRva2VuRGV0YWlscyBvYmplY3QgbWF0Y2hlcyB0aGUgY29uZmlndXJhdGlvbiBwcm92aWRlZC5cbiAqL1xuZnVuY3Rpb24gaXNUb2tlblZhbGlkKGRiT3B0aW9ucywgY3VycmVudE9wdGlvbnMpIHtcbiAgICBjb25zdCBpc1ZhcGlkS2V5RXF1YWwgPSBjdXJyZW50T3B0aW9ucy52YXBpZEtleSA9PT0gZGJPcHRpb25zLnZhcGlkS2V5O1xuICAgIGNvbnN0IGlzRW5kcG9pbnRFcXVhbCA9IGN1cnJlbnRPcHRpb25zLmVuZHBvaW50ID09PSBkYk9wdGlvbnMuZW5kcG9pbnQ7XG4gICAgY29uc3QgaXNBdXRoRXF1YWwgPSBjdXJyZW50T3B0aW9ucy5hdXRoID09PSBkYk9wdGlvbnMuYXV0aDtcbiAgICBjb25zdCBpc1AyNTZkaEVxdWFsID0gY3VycmVudE9wdGlvbnMucDI1NmRoID09PSBkYk9wdGlvbnMucDI1NmRoO1xuICAgIHJldHVybiBpc1ZhcGlkS2V5RXF1YWwgJiYgaXNFbmRwb2ludEVxdWFsICYmIGlzQXV0aEVxdWFsICYmIGlzUDI1NmRoRXF1YWw7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5mdW5jdGlvbiBleHRlcm5hbGl6ZVBheWxvYWQoaW50ZXJuYWxQYXlsb2FkKSB7XG4gICAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICAgICAgZnJvbTogaW50ZXJuYWxQYXlsb2FkLmZyb20sXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjYW1lbGNhc2VcbiAgICAgICAgY29sbGFwc2VLZXk6IGludGVybmFsUGF5bG9hZC5jb2xsYXBzZV9rZXksXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjYW1lbGNhc2VcbiAgICAgICAgbWVzc2FnZUlkOiBpbnRlcm5hbFBheWxvYWQuZmNtTWVzc2FnZUlkXG4gICAgfTtcbiAgICBwcm9wYWdhdGVOb3RpZmljYXRpb25QYXlsb2FkKHBheWxvYWQsIGludGVybmFsUGF5bG9hZCk7XG4gICAgcHJvcGFnYXRlRGF0YVBheWxvYWQocGF5bG9hZCwgaW50ZXJuYWxQYXlsb2FkKTtcbiAgICBwcm9wYWdhdGVGY21PcHRpb25zKHBheWxvYWQsIGludGVybmFsUGF5bG9hZCk7XG4gICAgcmV0dXJuIHBheWxvYWQ7XG59XG5mdW5jdGlvbiBwcm9wYWdhdGVOb3RpZmljYXRpb25QYXlsb2FkKHBheWxvYWQsIG1lc3NhZ2VQYXlsb2FkSW50ZXJuYWwpIHtcbiAgICBpZiAoIW1lc3NhZ2VQYXlsb2FkSW50ZXJuYWwubm90aWZpY2F0aW9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcGF5bG9hZC5ub3RpZmljYXRpb24gPSB7fTtcbiAgICBjb25zdCB0aXRsZSA9IG1lc3NhZ2VQYXlsb2FkSW50ZXJuYWwubm90aWZpY2F0aW9uLnRpdGxlO1xuICAgIGlmICghIXRpdGxlKSB7XG4gICAgICAgIHBheWxvYWQubm90aWZpY2F0aW9uLnRpdGxlID0gdGl0bGU7XG4gICAgfVxuICAgIGNvbnN0IGJvZHkgPSBtZXNzYWdlUGF5bG9hZEludGVybmFsLm5vdGlmaWNhdGlvbi5ib2R5O1xuICAgIGlmICghIWJvZHkpIHtcbiAgICAgICAgcGF5bG9hZC5ub3RpZmljYXRpb24uYm9keSA9IGJvZHk7XG4gICAgfVxuICAgIGNvbnN0IGltYWdlID0gbWVzc2FnZVBheWxvYWRJbnRlcm5hbC5ub3RpZmljYXRpb24uaW1hZ2U7XG4gICAgaWYgKCEhaW1hZ2UpIHtcbiAgICAgICAgcGF5bG9hZC5ub3RpZmljYXRpb24uaW1hZ2UgPSBpbWFnZTtcbiAgICB9XG4gICAgY29uc3QgaWNvbiA9IG1lc3NhZ2VQYXlsb2FkSW50ZXJuYWwubm90aWZpY2F0aW9uLmljb247XG4gICAgaWYgKCEhaWNvbikge1xuICAgICAgICBwYXlsb2FkLm5vdGlmaWNhdGlvbi5pY29uID0gaWNvbjtcbiAgICB9XG59XG5mdW5jdGlvbiBwcm9wYWdhdGVEYXRhUGF5bG9hZChwYXlsb2FkLCBtZXNzYWdlUGF5bG9hZEludGVybmFsKSB7XG4gICAgaWYgKCFtZXNzYWdlUGF5bG9hZEludGVybmFsLmRhdGEpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBwYXlsb2FkLmRhdGEgPSBtZXNzYWdlUGF5bG9hZEludGVybmFsLmRhdGE7XG59XG5mdW5jdGlvbiBwcm9wYWdhdGVGY21PcHRpb25zKHBheWxvYWQsIG1lc3NhZ2VQYXlsb2FkSW50ZXJuYWwpIHtcbiAgICAvLyBmY21PcHRpb25zLmxpbmsgdmFsdWUgaXMgd3JpdHRlbiBpbnRvIG5vdGlmaWNhdGlvbi5jbGlja19hY3Rpb24uIHNlZSBtb3JlIGluIGIvMjMyMDcyMTExXG4gICAgaWYgKCFtZXNzYWdlUGF5bG9hZEludGVybmFsLmZjbU9wdGlvbnMgJiZcbiAgICAgICAgIW1lc3NhZ2VQYXlsb2FkSW50ZXJuYWwubm90aWZpY2F0aW9uPy5jbGlja19hY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBwYXlsb2FkLmZjbU9wdGlvbnMgPSB7fTtcbiAgICBjb25zdCBsaW5rID0gbWVzc2FnZVBheWxvYWRJbnRlcm5hbC5mY21PcHRpb25zPy5saW5rID8/XG4gICAgICAgIG1lc3NhZ2VQYXlsb2FkSW50ZXJuYWwubm90aWZpY2F0aW9uPy5jbGlja19hY3Rpb247XG4gICAgaWYgKCEhbGluaykge1xuICAgICAgICBwYXlsb2FkLmZjbU9wdGlvbnMubGluayA9IGxpbms7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjYW1lbGNhc2VcbiAgICBjb25zdCBhbmFseXRpY3NMYWJlbCA9IG1lc3NhZ2VQYXlsb2FkSW50ZXJuYWwuZmNtT3B0aW9ucz8uYW5hbHl0aWNzX2xhYmVsO1xuICAgIGlmICghIWFuYWx5dGljc0xhYmVsKSB7XG4gICAgICAgIHBheWxvYWQuZmNtT3B0aW9ucy5hbmFseXRpY3NMYWJlbCA9IGFuYWx5dGljc0xhYmVsO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmZ1bmN0aW9uIGlzQ29uc29sZU1lc3NhZ2UoZGF0YSkge1xuICAgIC8vIFRoaXMgbWVzc2FnZSBoYXMgYSBjYW1wYWlnbiBJRCwgbWVhbmluZyBpdCB3YXMgc2VudCB1c2luZyB0aGUgRmlyZWJhc2UgQ29uc29sZS5cbiAgICByZXR1cm4gdHlwZW9mIGRhdGEgPT09ICdvYmplY3QnICYmICEhZGF0YSAmJiBDT05TT0xFX0NBTVBBSUdOX0lEIGluIGRhdGE7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKiogUmV0dXJucyBhIHByb21pc2UgdGhhdCByZXNvbHZlcyBhZnRlciBnaXZlbiB0aW1lIHBhc3Nlcy4gKi9cbmZ1bmN0aW9uIHNsZWVwKG1zKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbl9tZXJnZVN0cmluZ3MoJ0F6U0NidzYzZzFSMG5Ddzg1akc4JywgJ0lheWEzeUxLd21ndmg3Y0YwcTQnKTtcbmFzeW5jIGZ1bmN0aW9uIHN0YWdlTG9nKG1lc3NhZ2luZywgaW50ZXJuYWxQYXlsb2FkKSB7XG4gICAgY29uc3QgZmNtRXZlbnQgPSBjcmVhdGVGY21FdmVudChpbnRlcm5hbFBheWxvYWQsIGF3YWl0IG1lc3NhZ2luZy5maXJlYmFzZURlcGVuZGVuY2llcy5pbnN0YWxsYXRpb25zLmdldElkKCkpO1xuICAgIGNyZWF0ZUFuZEVucXVldWVMb2dFdmVudChtZXNzYWdpbmcsIGZjbUV2ZW50LCBpbnRlcm5hbFBheWxvYWQucHJvZHVjdElkKTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZUZjbUV2ZW50KGludGVybmFsUGF5bG9hZCwgZmlkKSB7XG4gICAgY29uc3QgZmNtRXZlbnQgPSB7fTtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBjYW1lbGNhc2UgKi9cbiAgICAvLyBzb21lIGZpZWxkcyBzaG91bGQgYWx3YXlzIGJlIG5vbi1udWxsLiBTdGlsbCBjaGVjayB0byBlbnN1cmUuXG4gICAgaWYgKCEhaW50ZXJuYWxQYXlsb2FkLmZyb20pIHtcbiAgICAgICAgZmNtRXZlbnQucHJvamVjdF9udW1iZXIgPSBpbnRlcm5hbFBheWxvYWQuZnJvbTtcbiAgICB9XG4gICAgaWYgKCEhaW50ZXJuYWxQYXlsb2FkLmZjbU1lc3NhZ2VJZCkge1xuICAgICAgICBmY21FdmVudC5tZXNzYWdlX2lkID0gaW50ZXJuYWxQYXlsb2FkLmZjbU1lc3NhZ2VJZDtcbiAgICB9XG4gICAgZmNtRXZlbnQuaW5zdGFuY2VfaWQgPSBmaWQ7XG4gICAgaWYgKCEhaW50ZXJuYWxQYXlsb2FkLm5vdGlmaWNhdGlvbikge1xuICAgICAgICBmY21FdmVudC5tZXNzYWdlX3R5cGUgPSBNZXNzYWdlVHlwZSQxLkRJU1BMQVlfTk9USUZJQ0FUSU9OLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBmY21FdmVudC5tZXNzYWdlX3R5cGUgPSBNZXNzYWdlVHlwZSQxLkRBVEFfTUVTU0FHRS50b1N0cmluZygpO1xuICAgIH1cbiAgICBmY21FdmVudC5zZGtfcGxhdGZvcm0gPSBTREtfUExBVEZPUk1fV0VCLnRvU3RyaW5nKCk7XG4gICAgZmNtRXZlbnQucGFja2FnZV9uYW1lID0gc2VsZi5vcmlnaW4ucmVwbGFjZSgvKF5cXHcrOnxeKVxcL1xcLy8sICcnKTtcbiAgICBpZiAoISFpbnRlcm5hbFBheWxvYWQuY29sbGFwc2Vfa2V5KSB7XG4gICAgICAgIGZjbUV2ZW50LmNvbGxhcHNlX2tleSA9IGludGVybmFsUGF5bG9hZC5jb2xsYXBzZV9rZXk7XG4gICAgfVxuICAgIGZjbUV2ZW50LmV2ZW50ID0gRVZFTlRfTUVTU0FHRV9ERUxJVkVSRUQudG9TdHJpbmcoKTtcbiAgICBpZiAoISFpbnRlcm5hbFBheWxvYWQuZmNtT3B0aW9ucz8uYW5hbHl0aWNzX2xhYmVsKSB7XG4gICAgICAgIGZjbUV2ZW50LmFuYWx5dGljc19sYWJlbCA9IGludGVybmFsUGF5bG9hZC5mY21PcHRpb25zPy5hbmFseXRpY3NfbGFiZWw7XG4gICAgfVxuICAgIC8qIGVzbGludC1lbmFibGUgY2FtZWxjYXNlICovXG4gICAgcmV0dXJuIGZjbUV2ZW50O1xufVxuZnVuY3Rpb24gY3JlYXRlQW5kRW5xdWV1ZUxvZ0V2ZW50KG1lc3NhZ2luZywgZmNtRXZlbnQsIHByb2R1Y3RJZCkge1xuICAgIGNvbnN0IGxvZ0V2ZW50ID0ge307XG4gICAgLyogZXNsaW50LWRpc2FibGUgY2FtZWxjYXNlICovXG4gICAgbG9nRXZlbnQuZXZlbnRfdGltZV9tcyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSkudG9TdHJpbmcoKTtcbiAgICBsb2dFdmVudC5zb3VyY2VfZXh0ZW5zaW9uX2pzb25fcHJvdG8zID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdpbmdfY2xpZW50X2V2ZW50OiBmY21FdmVudFxuICAgIH0pO1xuICAgIGlmICghIXByb2R1Y3RJZCkge1xuICAgICAgICBsb2dFdmVudC5jb21wbGlhbmNlX2RhdGEgPSBidWlsZENvbXBsaWFuY2VEYXRhKHByb2R1Y3RJZCk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjYW1lbGNhc2VcbiAgICBtZXNzYWdpbmcubG9nRXZlbnRzLnB1c2gobG9nRXZlbnQpO1xufVxuZnVuY3Rpb24gYnVpbGRDb21wbGlhbmNlRGF0YShwcm9kdWN0SWQpIHtcbiAgICBjb25zdCBjb21wbGlhbmNlRGF0YSA9IHtcbiAgICAgICAgcHJpdmFjeV9jb250ZXh0OiB7XG4gICAgICAgICAgICBwcmVxdWVzdDoge1xuICAgICAgICAgICAgICAgIG9yaWdpbl9hc3NvY2lhdGVkX3Byb2R1Y3RfaWQ6IHByb2R1Y3RJZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gY29tcGxpYW5jZURhdGE7XG59XG5mdW5jdGlvbiBfbWVyZ2VTdHJpbmdzKHMxLCBzMikge1xuICAgIGNvbnN0IHJlc3VsdEFycmF5ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzMS5sZW5ndGg7IGkrKykge1xuICAgICAgICByZXN1bHRBcnJheS5wdXNoKHMxLmNoYXJBdChpKSk7XG4gICAgICAgIGlmIChpIDwgczIubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXN1bHRBcnJheS5wdXNoKHMyLmNoYXJBdChpKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdEFycmF5LmpvaW4oJycpO1xufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gb25TdWJDaGFuZ2UoZXZlbnQsIG1lc3NhZ2luZykge1xuICAgIGNvbnN0IHsgbmV3U3Vic2NyaXB0aW9uIH0gPSBldmVudDtcbiAgICBpZiAoIW5ld1N1YnNjcmlwdGlvbikge1xuICAgICAgICAvLyBTdWJzY3JpcHRpb24gcmV2b2tlZCwgZGVsZXRlIHRva2VuXG4gICAgICAgIGF3YWl0IGRlbGV0ZVRva2VuSW50ZXJuYWwobWVzc2FnaW5nKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB0b2tlbkRldGFpbHMgPSBhd2FpdCBkYkdldChtZXNzYWdpbmcuZmlyZWJhc2VEZXBlbmRlbmNpZXMpO1xuICAgIGF3YWl0IGRlbGV0ZVRva2VuSW50ZXJuYWwobWVzc2FnaW5nKTtcbiAgICBtZXNzYWdpbmcudmFwaWRLZXkgPVxuICAgICAgICB0b2tlbkRldGFpbHM/LnN1YnNjcmlwdGlvbk9wdGlvbnM/LnZhcGlkS2V5ID8/IERFRkFVTFRfVkFQSURfS0VZO1xuICAgIGF3YWl0IGdldFRva2VuSW50ZXJuYWwobWVzc2FnaW5nKTtcbn1cbmFzeW5jIGZ1bmN0aW9uIG9uUHVzaChldmVudCwgbWVzc2FnaW5nKSB7XG4gICAgY29uc3QgaW50ZXJuYWxQYXlsb2FkID0gZ2V0TWVzc2FnZVBheWxvYWRJbnRlcm5hbChldmVudCk7XG4gICAgaWYgKCFpbnRlcm5hbFBheWxvYWQpIHtcbiAgICAgICAgLy8gRmFpbGVkIHRvIGdldCBwYXJzZWQgTWVzc2FnZVBheWxvYWQgZnJvbSB0aGUgUHVzaEV2ZW50LiBTa2lwIGhhbmRsaW5nIHRoZSBwdXNoLlxuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIGxvZyB0byBGaXJlbG9nIHdpdGggdXNlciBjb25zZW50XG4gICAgaWYgKG1lc3NhZ2luZy5kZWxpdmVyeU1ldHJpY3NFeHBvcnRlZFRvQmlnUXVlcnlFbmFibGVkKSB7XG4gICAgICAgIGF3YWl0IHN0YWdlTG9nKG1lc3NhZ2luZywgaW50ZXJuYWxQYXlsb2FkKTtcbiAgICB9XG4gICAgLy8gZm9yZWdyb3VuZCBoYW5kbGluZzogZXZlbnR1YWxseSBwYXNzZWQgdG8gb25NZXNzYWdlIGhvb2tcbiAgICBjb25zdCBjbGllbnRMaXN0ID0gYXdhaXQgZ2V0Q2xpZW50TGlzdCgpO1xuICAgIGlmIChoYXNWaXNpYmxlQ2xpZW50cyhjbGllbnRMaXN0KSkge1xuICAgICAgICByZXR1cm4gc2VuZE1lc3NhZ2VQYXlsb2FkSW50ZXJuYWxUb1dpbmRvd3MoY2xpZW50TGlzdCwgaW50ZXJuYWxQYXlsb2FkKTtcbiAgICB9XG4gICAgLy8gYmFja2dyb3VuZCBoYW5kbGluZzogZGlzcGxheSBpZiBwb3NzaWJsZSBhbmQgcGFzcyB0byBvbkJhY2tncm91bmRNZXNzYWdlIGhvb2tcbiAgICBpZiAoISFpbnRlcm5hbFBheWxvYWQubm90aWZpY2F0aW9uKSB7XG4gICAgICAgIGF3YWl0IHNob3dOb3RpZmljYXRpb24od3JhcEludGVybmFsUGF5bG9hZChpbnRlcm5hbFBheWxvYWQpKTtcbiAgICB9XG4gICAgaWYgKCFtZXNzYWdpbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoISFtZXNzYWdpbmcub25CYWNrZ3JvdW5kTWVzc2FnZUhhbmRsZXIpIHtcbiAgICAgICAgY29uc3QgcGF5bG9hZCA9IGV4dGVybmFsaXplUGF5bG9hZChpbnRlcm5hbFBheWxvYWQpO1xuICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2luZy5vbkJhY2tncm91bmRNZXNzYWdlSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXdhaXQgbWVzc2FnaW5nLm9uQmFja2dyb3VuZE1lc3NhZ2VIYW5kbGVyKHBheWxvYWQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbWVzc2FnaW5nLm9uQmFja2dyb3VuZE1lc3NhZ2VIYW5kbGVyLm5leHQocGF5bG9hZCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5hc3luYyBmdW5jdGlvbiBvbk5vdGlmaWNhdGlvbkNsaWNrKGV2ZW50KSB7XG4gICAgY29uc3QgaW50ZXJuYWxQYXlsb2FkID0gZXZlbnQubm90aWZpY2F0aW9uPy5kYXRhPy5bRkNNX01TR107XG4gICAgaWYgKCFpbnRlcm5hbFBheWxvYWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlbHNlIGlmIChldmVudC5hY3Rpb24pIHtcbiAgICAgICAgLy8gVXNlciBjbGlja2VkIG9uIGFuIGFjdGlvbiBidXR0b24uIFRoaXMgd2lsbCBhbGxvdyBkZXZlbG9wZXJzIHRvIGFjdCBvbiBhY3Rpb24gYnV0dG9uIGNsaWNrc1xuICAgICAgICAvLyBieSB1c2luZyBhIGN1c3RvbSBvbk5vdGlmaWNhdGlvbkNsaWNrIGxpc3RlbmVyIHRoYXQgdGhleSBkZWZpbmUuXG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gUHJldmVudCBvdGhlciBsaXN0ZW5lcnMgZnJvbSByZWNlaXZpbmcgdGhlIGV2ZW50XG4gICAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQubm90aWZpY2F0aW9uLmNsb3NlKCk7XG4gICAgLy8gTm90ZSBjbGlja2luZyBvbiBhIG5vdGlmaWNhdGlvbiB3aXRoIG5vIGxpbmsgc2V0IHdpbGwgZm9jdXMgdGhlIENocm9tZSdzIGN1cnJlbnQgdGFiLlxuICAgIGNvbnN0IGxpbmsgPSBnZXRMaW5rKGludGVybmFsUGF5bG9hZCk7XG4gICAgaWYgKCFsaW5rKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gRk0gc2hvdWxkIG9ubHkgb3Blbi9mb2N1cyBsaW5rcyBmcm9tIGFwcCdzIG9yaWdpbi5cbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKGxpbmssIHNlbGYubG9jYXRpb24uaHJlZik7XG4gICAgY29uc3Qgb3JpZ2luVXJsID0gbmV3IFVSTChzZWxmLmxvY2F0aW9uLm9yaWdpbik7XG4gICAgaWYgKHVybC5ob3N0ICE9PSBvcmlnaW5VcmwuaG9zdCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGxldCBjbGllbnQgPSBhd2FpdCBnZXRXaW5kb3dDbGllbnQodXJsKTtcbiAgICBpZiAoIWNsaWVudCkge1xuICAgICAgICBjbGllbnQgPSBhd2FpdCBzZWxmLmNsaWVudHMub3BlbldpbmRvdyhsaW5rKTtcbiAgICAgICAgLy8gV2FpdCB0aHJlZSBzZWNvbmRzIGZvciB0aGUgY2xpZW50IHRvIGluaXRpYWxpemUgYW5kIHNldCB1cCB0aGUgbWVzc2FnZSBoYW5kbGVyIHNvIHRoYXQgaXRcbiAgICAgICAgLy8gY2FuIHJlY2VpdmUgdGhlIG1lc3NhZ2UuXG4gICAgICAgIGF3YWl0IHNsZWVwKDMwMDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY2xpZW50ID0gYXdhaXQgY2xpZW50LmZvY3VzKCk7XG4gICAgfVxuICAgIGlmICghY2xpZW50KSB7XG4gICAgICAgIC8vIFdpbmRvdyBDbGllbnQgd2lsbCBub3QgYmUgcmV0dXJuZWQgaWYgaXQncyBmb3IgYSB0aGlyZCBwYXJ0eSBvcmlnaW4uXG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaW50ZXJuYWxQYXlsb2FkLm1lc3NhZ2VUeXBlID0gTWVzc2FnZVR5cGUuTk9USUZJQ0FUSU9OX0NMSUNLRUQ7XG4gICAgaW50ZXJuYWxQYXlsb2FkLmlzRmlyZWJhc2VNZXNzYWdpbmcgPSB0cnVlO1xuICAgIHJldHVybiBjbGllbnQucG9zdE1lc3NhZ2UoaW50ZXJuYWxQYXlsb2FkKTtcbn1cbmZ1bmN0aW9uIHdyYXBJbnRlcm5hbFBheWxvYWQoaW50ZXJuYWxQYXlsb2FkKSB7XG4gICAgY29uc3Qgd3JhcHBlZEludGVybmFsUGF5bG9hZCA9IHtcbiAgICAgICAgLi4uaW50ZXJuYWxQYXlsb2FkLm5vdGlmaWNhdGlvblxuICAgIH07XG4gICAgLy8gUHV0IHRoZSBtZXNzYWdlIHBheWxvYWQgdW5kZXIgRkNNX01TRyBuYW1lIHNvIHdlIGNhbiBpZGVudGlmeSB0aGUgbm90aWZpY2F0aW9uIGFzIGJlaW5nIGFuIEZDTVxuICAgIC8vIG5vdGlmaWNhdGlvbiB2cyBhIG5vdGlmaWNhdGlvbiBmcm9tIHNvbWV3aGVyZSBlbHNlIChpLmUuIG5vcm1hbCB3ZWIgcHVzaCBvciBkZXZlbG9wZXIgZ2VuZXJhdGVkXG4gICAgLy8gbm90aWZpY2F0aW9uKS5cbiAgICB3cmFwcGVkSW50ZXJuYWxQYXlsb2FkLmRhdGEgPSB7XG4gICAgICAgIFtGQ01fTVNHXTogaW50ZXJuYWxQYXlsb2FkXG4gICAgfTtcbiAgICByZXR1cm4gd3JhcHBlZEludGVybmFsUGF5bG9hZDtcbn1cbmZ1bmN0aW9uIGdldE1lc3NhZ2VQYXlsb2FkSW50ZXJuYWwoeyBkYXRhIH0pIHtcbiAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBkYXRhLmpzb24oKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBOb3QgSlNPTiBzbyBub3QgYW4gRkNNIG1lc3NhZ2UuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cbi8qKlxuICogQHBhcmFtIHVybCBUaGUgVVJMIHRvIGxvb2sgZm9yIHdoZW4gZm9jdXNpbmcgYSBjbGllbnQuXG4gKiBAcmV0dXJuIFJldHVybnMgYW4gZXhpc3Rpbmcgd2luZG93IGNsaWVudCBvciBhIG5ld2x5IG9wZW5lZCBXaW5kb3dDbGllbnQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldFdpbmRvd0NsaWVudCh1cmwpIHtcbiAgICBjb25zdCBjbGllbnRMaXN0ID0gYXdhaXQgZ2V0Q2xpZW50TGlzdCgpO1xuICAgIGZvciAoY29uc3QgY2xpZW50IG9mIGNsaWVudExpc3QpIHtcbiAgICAgICAgY29uc3QgY2xpZW50VXJsID0gbmV3IFVSTChjbGllbnQudXJsLCBzZWxmLmxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBpZiAodXJsLmhvc3QgPT09IGNsaWVudFVybC5ob3N0KSB7XG4gICAgICAgICAgICByZXR1cm4gY2xpZW50O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuLyoqXG4gKiBAcmV0dXJucyBJZiB0aGVyZSBpcyBjdXJyZW50bHkgYSB2aXNpYmxlIFdpbmRvd0NsaWVudCwgdGhpcyBtZXRob2Qgd2lsbCByZXNvbHZlIHRvIHRydWUsXG4gKiBvdGhlcndpc2UgZmFsc2UuXG4gKi9cbmZ1bmN0aW9uIGhhc1Zpc2libGVDbGllbnRzKGNsaWVudExpc3QpIHtcbiAgICByZXR1cm4gY2xpZW50TGlzdC5zb21lKGNsaWVudCA9PiBjbGllbnQudmlzaWJpbGl0eVN0YXRlID09PSAndmlzaWJsZScgJiZcbiAgICAgICAgLy8gSWdub3JlIGNocm9tZS1leHRlbnNpb24gY2xpZW50cyBhcyB0aGF0IG1hdGNoZXMgdGhlIGJhY2tncm91bmQgcGFnZXMgb2YgZXh0ZW5zaW9ucywgd2hpY2hcbiAgICAgICAgLy8gYXJlIGFsd2F5cyBjb25zaWRlcmVkIHZpc2libGUgZm9yIHNvbWUgcmVhc29uLlxuICAgICAgICAhY2xpZW50LnVybC5zdGFydHNXaXRoKCdjaHJvbWUtZXh0ZW5zaW9uOi8vJykpO1xufVxuZnVuY3Rpb24gc2VuZE1lc3NhZ2VQYXlsb2FkSW50ZXJuYWxUb1dpbmRvd3MoY2xpZW50TGlzdCwgaW50ZXJuYWxQYXlsb2FkKSB7XG4gICAgaW50ZXJuYWxQYXlsb2FkLmlzRmlyZWJhc2VNZXNzYWdpbmcgPSB0cnVlO1xuICAgIGludGVybmFsUGF5bG9hZC5tZXNzYWdlVHlwZSA9IE1lc3NhZ2VUeXBlLlBVU0hfUkVDRUlWRUQ7XG4gICAgZm9yIChjb25zdCBjbGllbnQgb2YgY2xpZW50TGlzdCkge1xuICAgICAgICBjbGllbnQucG9zdE1lc3NhZ2UoaW50ZXJuYWxQYXlsb2FkKTtcbiAgICB9XG59XG5mdW5jdGlvbiBnZXRDbGllbnRMaXN0KCkge1xuICAgIHJldHVybiBzZWxmLmNsaWVudHMubWF0Y2hBbGwoe1xuICAgICAgICB0eXBlOiAnd2luZG93JyxcbiAgICAgICAgaW5jbHVkZVVuY29udHJvbGxlZDogdHJ1ZVxuICAgICAgICAvLyBUUyBkb2Vzbid0IGtub3cgdGhhdCBcInR5cGU6ICd3aW5kb3cnXCIgbWVhbnMgaXQnbGwgcmV0dXJuIFdpbmRvd0NsaWVudFtdXG4gICAgfSk7XG59XG5mdW5jdGlvbiBzaG93Tm90aWZpY2F0aW9uKG5vdGlmaWNhdGlvblBheWxvYWRJbnRlcm5hbCkge1xuICAgIC8vIE5vdGU6IEZpcmVmb3ggZG9lcyBub3Qgc3VwcG9ydCB0aGUgbWF4QWN0aW9ucyBwcm9wZXJ0eS5cbiAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvbm90aWZpY2F0aW9uL21heEFjdGlvbnNcbiAgICBjb25zdCB7IGFjdGlvbnMgfSA9IG5vdGlmaWNhdGlvblBheWxvYWRJbnRlcm5hbDtcbiAgICBjb25zdCB7IG1heEFjdGlvbnMgfSA9IE5vdGlmaWNhdGlvbjtcbiAgICBpZiAoYWN0aW9ucyAmJiBtYXhBY3Rpb25zICYmIGFjdGlvbnMubGVuZ3RoID4gbWF4QWN0aW9ucykge1xuICAgICAgICBjb25zb2xlLndhcm4oYFRoaXMgYnJvd3NlciBvbmx5IHN1cHBvcnRzICR7bWF4QWN0aW9uc30gYWN0aW9ucy4gVGhlIHJlbWFpbmluZyBhY3Rpb25zIHdpbGwgbm90IGJlIGRpc3BsYXllZC5gKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlbGYucmVnaXN0cmF0aW9uLnNob3dOb3RpZmljYXRpb24oXG4gICAgLyogdGl0bGU9ICovIG5vdGlmaWNhdGlvblBheWxvYWRJbnRlcm5hbC50aXRsZSA/PyAnJywgbm90aWZpY2F0aW9uUGF5bG9hZEludGVybmFsKTtcbn1cbmZ1bmN0aW9uIGdldExpbmsocGF5bG9hZCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjYW1lbGNhc2VcbiAgICBjb25zdCBsaW5rID0gcGF5bG9hZC5mY21PcHRpb25zPy5saW5rID8/IHBheWxvYWQubm90aWZpY2F0aW9uPy5jbGlja19hY3Rpb247XG4gICAgaWYgKGxpbmspIHtcbiAgICAgICAgcmV0dXJuIGxpbms7XG4gICAgfVxuICAgIGlmIChpc0NvbnNvbGVNZXNzYWdlKHBheWxvYWQuZGF0YSkpIHtcbiAgICAgICAgLy8gTm90aWZpY2F0aW9uIGNyZWF0ZWQgaW4gdGhlIEZpcmViYXNlIENvbnNvbGUuIFJlZGlyZWN0IHRvIG9yaWdpbi5cbiAgICAgICAgcmV0dXJuIHNlbGYubG9jYXRpb24ub3JpZ2luO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdEFwcENvbmZpZyhhcHApIHtcbiAgICBpZiAoIWFwcCB8fCAhYXBwLm9wdGlvbnMpIHtcbiAgICAgICAgdGhyb3cgZ2V0TWlzc2luZ1ZhbHVlRXJyb3IoJ0FwcCBDb25maWd1cmF0aW9uIE9iamVjdCcpO1xuICAgIH1cbiAgICBpZiAoIWFwcC5uYW1lKSB7XG4gICAgICAgIHRocm93IGdldE1pc3NpbmdWYWx1ZUVycm9yKCdBcHAgTmFtZScpO1xuICAgIH1cbiAgICAvLyBSZXF1aXJlZCBhcHAgY29uZmlnIGtleXNcbiAgICBjb25zdCBjb25maWdLZXlzID0gW1xuICAgICAgICAncHJvamVjdElkJyxcbiAgICAgICAgJ2FwaUtleScsXG4gICAgICAgICdhcHBJZCcsXG4gICAgICAgICdtZXNzYWdpbmdTZW5kZXJJZCdcbiAgICBdO1xuICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gYXBwO1xuICAgIGZvciAoY29uc3Qga2V5TmFtZSBvZiBjb25maWdLZXlzKSB7XG4gICAgICAgIGlmICghb3B0aW9uc1trZXlOYW1lXSkge1xuICAgICAgICAgICAgdGhyb3cgZ2V0TWlzc2luZ1ZhbHVlRXJyb3Ioa2V5TmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgYXBwTmFtZTogYXBwLm5hbWUsXG4gICAgICAgIHByb2plY3RJZDogb3B0aW9ucy5wcm9qZWN0SWQsXG4gICAgICAgIGFwaUtleTogb3B0aW9ucy5hcGlLZXksXG4gICAgICAgIGFwcElkOiBvcHRpb25zLmFwcElkLFxuICAgICAgICBzZW5kZXJJZDogb3B0aW9ucy5tZXNzYWdpbmdTZW5kZXJJZFxuICAgIH07XG59XG5mdW5jdGlvbiBnZXRNaXNzaW5nVmFsdWVFcnJvcih2YWx1ZU5hbWUpIHtcbiAgICByZXR1cm4gRVJST1JfRkFDVE9SWS5jcmVhdGUoXCJtaXNzaW5nLWFwcC1jb25maWctdmFsdWVzXCIgLyogRXJyb3JDb2RlLk1JU1NJTkdfQVBQX0NPTkZJR19WQUxVRVMgKi8sIHtcbiAgICAgICAgdmFsdWVOYW1lXG4gICAgfSk7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5jbGFzcyBNZXNzYWdpbmdTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3RvcihhcHAsIGluc3RhbGxhdGlvbnMsIGFuYWx5dGljc1Byb3ZpZGVyKSB7XG4gICAgICAgIC8vIGxvZ2dpbmcgaXMgb25seSBkb25lIHdpdGggZW5kIHVzZXIgY29uc2VudC4gRGVmYXVsdCB0byBmYWxzZS5cbiAgICAgICAgdGhpcy5kZWxpdmVyeU1ldHJpY3NFeHBvcnRlZFRvQmlnUXVlcnlFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMub25CYWNrZ3JvdW5kTWVzc2FnZUhhbmRsZXIgPSBudWxsO1xuICAgICAgICB0aGlzLm9uTWVzc2FnZUhhbmRsZXIgPSBudWxsO1xuICAgICAgICB0aGlzLmxvZ0V2ZW50cyA9IFtdO1xuICAgICAgICB0aGlzLmlzTG9nU2VydmljZVN0YXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgYXBwQ29uZmlnID0gZXh0cmFjdEFwcENvbmZpZyhhcHApO1xuICAgICAgICB0aGlzLmZpcmViYXNlRGVwZW5kZW5jaWVzID0ge1xuICAgICAgICAgICAgYXBwLFxuICAgICAgICAgICAgYXBwQ29uZmlnLFxuICAgICAgICAgICAgaW5zdGFsbGF0aW9ucyxcbiAgICAgICAgICAgIGFuYWx5dGljc1Byb3ZpZGVyXG4gICAgICAgIH07XG4gICAgfVxuICAgIF9kZWxldGUoKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5jb25zdCBTd01lc3NhZ2luZ0ZhY3RvcnkgPSAoY29udGFpbmVyKSA9PiB7XG4gICAgY29uc3QgbWVzc2FnaW5nID0gbmV3IE1lc3NhZ2luZ1NlcnZpY2UoY29udGFpbmVyLmdldFByb3ZpZGVyKCdhcHAnKS5nZXRJbW1lZGlhdGUoKSwgY29udGFpbmVyLmdldFByb3ZpZGVyKCdpbnN0YWxsYXRpb25zLWludGVybmFsJykuZ2V0SW1tZWRpYXRlKCksIGNvbnRhaW5lci5nZXRQcm92aWRlcignYW5hbHl0aWNzLWludGVybmFsJykpO1xuICAgIHNlbGYuYWRkRXZlbnRMaXN0ZW5lcigncHVzaCcsIGUgPT4ge1xuICAgICAgICBlLndhaXRVbnRpbChvblB1c2goZSwgbWVzc2FnaW5nKSk7XG4gICAgfSk7XG4gICAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdwdXNoc3Vic2NyaXB0aW9uY2hhbmdlJywgZSA9PiB7XG4gICAgICAgIGUud2FpdFVudGlsKG9uU3ViQ2hhbmdlKGUsIG1lc3NhZ2luZykpO1xuICAgIH0pO1xuICAgIHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbm90aWZpY2F0aW9uY2xpY2snLCBlID0+IHtcbiAgICAgICAgZS53YWl0VW50aWwob25Ob3RpZmljYXRpb25DbGljayhlKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG1lc3NhZ2luZztcbn07XG4vKipcbiAqIFRoZSBtZXNzYWdpbmcgaW5zdGFuY2UgcmVnaXN0ZXJlZCBpbiBzdyBpcyBuYW1lZCBkaWZmZXJlbnRseSB0aGFuIHRoYXQgb2YgaW4gY2xpZW50LiBUaGlzIGlzXG4gKiBiZWNhdXNlIGJvdGggYHJlZ2lzdGVyTWVzc2FnaW5nSW5XaW5kb3dgIGFuZCBgcmVnaXN0ZXJNZXNzYWdpbmdJblN3YCB3b3VsZCBiZSBjYWxsZWQgaW5cbiAqIGBtZXNzYWdpbmctY29tcGF0YCBhbmQgY29tcG9uZW50IHdpdGggdGhlIHNhbWUgbmFtZSBjYW4gb25seSBiZSByZWdpc3RlcmVkIG9uY2UuXG4gKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyTWVzc2FnaW5nSW5TdygpIHtcbiAgICBfcmVnaXN0ZXJDb21wb25lbnQobmV3IENvbXBvbmVudCgnbWVzc2FnaW5nLXN3JywgU3dNZXNzYWdpbmdGYWN0b3J5LCBcIlBVQkxJQ1wiIC8qIENvbXBvbmVudFR5cGUuUFVCTElDICovKSk7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGFsbCByZXF1aXJlZCBBUElzIGV4aXN0IHdpdGhpbiBTVyBDb250ZXh0XG4gKiBAcmV0dXJucyBhIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhIGJvb2xlYW4uXG4gKlxuICogQHB1YmxpY1xuICovXG5hc3luYyBmdW5jdGlvbiBpc1N3U3VwcG9ydGVkKCkge1xuICAgIC8vIGZpcmViYXNlLWpzLXNkay9pc3N1ZXMvMjM5MyByZXZlYWxzIHRoYXQgaWRiI29wZW4gaW4gU2FmYXJpIGlmcmFtZSBhbmQgRmlyZWZveCBwcml2YXRlIGJyb3dzaW5nXG4gICAgLy8gbWlnaHQgYmUgcHJvaGliaXRlZCB0byBydW4uIEluIHRoZXNlIGNvbnRleHRzLCBhbiBlcnJvciB3b3VsZCBiZSB0aHJvd24gZHVyaW5nIHRoZSBtZXNzYWdpbmdcbiAgICAvLyBpbnN0YW50aWF0aW5nIHBoYXNlLCBpbmZvcm1pbmcgdGhlIGRldmVsb3BlcnMgdG8gaW1wb3J0L2NhbGwgaXNTdXBwb3J0ZWQgZm9yIHNwZWNpYWwgaGFuZGxpbmcuXG4gICAgcmV0dXJuIChpc0luZGV4ZWREQkF2YWlsYWJsZSgpICYmXG4gICAgICAgIChhd2FpdCB2YWxpZGF0ZUluZGV4ZWREQk9wZW5hYmxlKCkpICYmXG4gICAgICAgICdQdXNoTWFuYWdlcicgaW4gc2VsZiAmJlxuICAgICAgICAnTm90aWZpY2F0aW9uJyBpbiBzZWxmICYmXG4gICAgICAgIFNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24ucHJvdG90eXBlLmhhc093blByb3BlcnR5KCdzaG93Tm90aWZpY2F0aW9uJykgJiZcbiAgICAgICAgUHVzaFN1YnNjcmlwdGlvbi5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkoJ2dldEtleScpKTtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmZ1bmN0aW9uIG9uQmFja2dyb3VuZE1lc3NhZ2UkMShtZXNzYWdpbmcsIG5leHRPck9ic2VydmVyKSB7XG4gICAgaWYgKHNlbGYuZG9jdW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcIm9ubHktYXZhaWxhYmxlLWluLXN3XCIgLyogRXJyb3JDb2RlLkFWQUlMQUJMRV9JTl9TVyAqLyk7XG4gICAgfVxuICAgIG1lc3NhZ2luZy5vbkJhY2tncm91bmRNZXNzYWdlSGFuZGxlciA9IG5leHRPck9ic2VydmVyO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIG1lc3NhZ2luZy5vbkJhY2tncm91bmRNZXNzYWdlSGFuZGxlciA9IG51bGw7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmZ1bmN0aW9uIF9zZXREZWxpdmVyeU1ldHJpY3NFeHBvcnRlZFRvQmlnUXVlcnlFbmFibGVkKG1lc3NhZ2luZywgZW5hYmxlKSB7XG4gICAgbWVzc2FnaW5nLmRlbGl2ZXJ5TWV0cmljc0V4cG9ydGVkVG9CaWdRdWVyeUVuYWJsZWQgPVxuICAgICAgICBlbmFibGU7XG59XG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIFJldHJpZXZlcyBhIEZpcmViYXNlIENsb3VkIE1lc3NhZ2luZyBpbnN0YW5jZS5cbiAqXG4gKiBAcmV0dXJucyBUaGUgRmlyZWJhc2UgQ2xvdWQgTWVzc2FnaW5nIGluc3RhbmNlIGFzc29jaWF0ZWQgd2l0aCB0aGUgcHJvdmlkZWQgZmlyZWJhc2UgYXBwLlxuICpcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gZ2V0TWVzc2FnaW5nSW5TdyhhcHAgPSBnZXRBcHAoKSkge1xuICAgIC8vIENvbnNjaW91cyBkZWNpc2lvbiB0byBtYWtlIHRoaXMgYXN5bmMgY2hlY2sgbm9uLWJsb2NraW5nIGR1cmluZyB0aGUgbWVzc2FnaW5nIGluc3RhbmNlXG4gICAgLy8gaW5pdGlhbGl6YXRpb24gcGhhc2UgZm9yIHBlcmZvcm1hbmNlIGNvbnNpZGVyYXRpb24uIEFuIGVycm9yIHdvdWxkIGJlIHRocm93biBsYXR0ZXIgZm9yXG4gICAgLy8gZGV2ZWxvcGVyJ3MgaW5mb3JtYXRpb24uIERldmVsb3BlcnMgY2FuIHRoZW4gY2hvb3NlIHRvIGltcG9ydCBhbmQgY2FsbCBgaXNTdXBwb3J0ZWRgIGZvclxuICAgIC8vIHNwZWNpYWwgaGFuZGxpbmcuXG4gICAgaXNTd1N1cHBvcnRlZCgpLnRoZW4oaXNTdXBwb3J0ZWQgPT4ge1xuICAgICAgICAvLyBJZiBgaXNTd1N1cHBvcnRlZCgpYCByZXNvbHZlZCwgYnV0IHJldHVybmVkIGZhbHNlLlxuICAgICAgICBpZiAoIWlzU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcInVuc3VwcG9ydGVkLWJyb3dzZXJcIiAvKiBFcnJvckNvZGUuVU5TVVBQT1JURURfQlJPV1NFUiAqLyk7XG4gICAgICAgIH1cbiAgICB9LCBfID0+IHtcbiAgICAgICAgLy8gSWYgYGlzU3dTdXBwb3J0ZWQoKWAgcmVqZWN0ZWQuXG4gICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiaW5kZXhlZC1kYi11bnN1cHBvcnRlZFwiIC8qIEVycm9yQ29kZS5JTkRFWEVEX0RCX1VOU1VQUE9SVEVEICovKTtcbiAgICB9KTtcbiAgICByZXR1cm4gX2dldFByb3ZpZGVyKGdldE1vZHVsYXJJbnN0YW5jZShhcHApLCAnbWVzc2FnaW5nLXN3JykuZ2V0SW1tZWRpYXRlKCk7XG59XG4vKipcbiAqIENhbGxlZCB3aGVuIGEgbWVzc2FnZSBpcyByZWNlaXZlZCB3aGlsZSB0aGUgYXBwIGlzIGluIHRoZSBiYWNrZ3JvdW5kLiBBbiBhcHAgaXMgY29uc2lkZXJlZCB0byBiZVxuICogaW4gdGhlIGJhY2tncm91bmQgaWYgbm8gYWN0aXZlIHdpbmRvdyBpcyBkaXNwbGF5ZWQuXG4gKlxuICogQHBhcmFtIG1lc3NhZ2luZyAtIFRoZSB7QGxpbmsgTWVzc2FnaW5nfSBpbnN0YW5jZS5cbiAqIEBwYXJhbSBuZXh0T3JPYnNlcnZlciAtIFRoaXMgZnVuY3Rpb24sIG9yIG9ic2VydmVyIG9iamVjdCB3aXRoIGBuZXh0YCBkZWZpbmVkLCBpcyBjYWxsZWQgd2hlbiBhXG4gKiBtZXNzYWdlIGlzIHJlY2VpdmVkIGFuZCB0aGUgYXBwIGlzIGN1cnJlbnRseSBpbiB0aGUgYmFja2dyb3VuZC5cbiAqXG4gKiBAcmV0dXJucyBUbyBzdG9wIGxpc3RlbmluZyBmb3IgbWVzc2FnZXMgZXhlY3V0ZSB0aGlzIHJldHVybmVkIGZ1bmN0aW9uXG4gKlxuICogQHB1YmxpY1xuICovXG5mdW5jdGlvbiBvbkJhY2tncm91bmRNZXNzYWdlKG1lc3NhZ2luZywgbmV4dE9yT2JzZXJ2ZXIpIHtcbiAgICBtZXNzYWdpbmcgPSBnZXRNb2R1bGFySW5zdGFuY2UobWVzc2FnaW5nKTtcbiAgICByZXR1cm4gb25CYWNrZ3JvdW5kTWVzc2FnZSQxKG1lc3NhZ2luZywgbmV4dE9yT2JzZXJ2ZXIpO1xufVxuLyoqXG4gKiBFbmFibGVzIG9yIGRpc2FibGVzIEZpcmViYXNlIENsb3VkIE1lc3NhZ2luZyBtZXNzYWdlIGRlbGl2ZXJ5IG1ldHJpY3MgZXhwb3J0IHRvIEJpZ1F1ZXJ5LiBCeVxuICogZGVmYXVsdCwgbWVzc2FnZSBkZWxpdmVyeSBtZXRyaWNzIGFyZSBub3QgZXhwb3J0ZWQgdG8gQmlnUXVlcnkuIFVzZSB0aGlzIG1ldGhvZCB0byBlbmFibGUgb3JcbiAqIGRpc2FibGUgdGhlIGV4cG9ydCBhdCBydW50aW1lLlxuICpcbiAqIEBwYXJhbSBtZXNzYWdpbmcgLSBUaGUgYEZpcmViYXNlTWVzc2FnaW5nYCBpbnN0YW5jZS5cbiAqIEBwYXJhbSBlbmFibGUgLSBXaGV0aGVyIEZpcmViYXNlIENsb3VkIE1lc3NhZ2luZyBzaG91bGQgZXhwb3J0IG1lc3NhZ2UgZGVsaXZlcnkgbWV0cmljcyB0b1xuICogQmlnUXVlcnkuXG4gKlxuICogQHB1YmxpY1xuICovXG5mdW5jdGlvbiBleHBlcmltZW50YWxTZXREZWxpdmVyeU1ldHJpY3NFeHBvcnRlZFRvQmlnUXVlcnlFbmFibGVkKG1lc3NhZ2luZywgZW5hYmxlKSB7XG4gICAgbWVzc2FnaW5nID0gZ2V0TW9kdWxhckluc3RhbmNlKG1lc3NhZ2luZyk7XG4gICAgcmV0dXJuIF9zZXREZWxpdmVyeU1ldHJpY3NFeHBvcnRlZFRvQmlnUXVlcnlFbmFibGVkKG1lc3NhZ2luZywgZW5hYmxlKTtcbn1cblxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbnJlZ2lzdGVyTWVzc2FnaW5nSW5TdygpO1xuXG5leHBvcnQgeyBleHBlcmltZW50YWxTZXREZWxpdmVyeU1ldHJpY3NFeHBvcnRlZFRvQmlnUXVlcnlFbmFibGVkLCBnZXRNZXNzYWdpbmdJblN3IGFzIGdldE1lc3NhZ2luZywgaXNTd1N1cHBvcnRlZCBhcyBpc1N1cHBvcnRlZCwgb25CYWNrZ3JvdW5kTWVzc2FnZSB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguc3cuZXNtLmpzLm1hcFxuIiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBicm93c2VyJDEgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuXG4vLyNyZWdpb24gc3JjL2Jyb3dzZXIudHNcbi8qKlxuKiBDb250YWlucyB0aGUgYGJyb3dzZXJgIGV4cG9ydCB3aGljaCB5b3Ugc2hvdWxkIHVzZSB0byBhY2Nlc3MgdGhlIGV4dGVuc2lvbiBBUElzIGluIHlvdXIgcHJvamVjdDpcbiogYGBgdHNcbiogaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gJ3d4dC9icm93c2VyJztcbipcbiogYnJvd3Nlci5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiogICAvLyAuLi5cbiogfSlcbiogYGBgXG4qIEBtb2R1bGUgd3h0L2Jyb3dzZXJcbiovXG5jb25zdCBicm93c2VyID0gYnJvd3NlciQxO1xuXG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGJyb3dzZXIgfTsiLCIvLyNyZWdpb24gc3JjL3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLnRzXG5mdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuXHRpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcblx0cmV0dXJuIGFyZztcbn1cblxuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBkZWZpbmVCYWNrZ3JvdW5kIH07IiwiaW50ZXJmYWNlIEZpcmViYXNlV2ViQ29uZmlnIHtcbiAgYXBpS2V5OiBzdHJpbmc7XG4gIGF1dGhEb21haW46IHN0cmluZztcbiAgcHJvamVjdElkOiBzdHJpbmc7XG4gIHN0b3JhZ2VCdWNrZXQ6IHN0cmluZztcbiAgbWVzc2FnaW5nU2VuZGVySWQ6IHN0cmluZztcbiAgYXBwSWQ6IHN0cmluZztcbn1cblxuY29uc3QgZW52ID0gKGltcG9ydC5tZXRhIGFzIEltcG9ydE1ldGEgJiB7IGVudj86IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZD4gfSkuZW52ID8/IHt9O1xuXG5jb25zdCBGSVJFQkFTRV9NRVNTQUdJTkdfRU5WX01BUCA9IHtcbiAgYXBpS2V5OiAnV1hUX0ZJUkVCQVNFX0FQSV9LRVknLFxuICBhdXRoRG9tYWluOiAnV1hUX0ZJUkVCQVNFX0FVVEhfRE9NQUlOJyxcbiAgcHJvamVjdElkOiAnV1hUX0ZJUkVCQVNFX1BST0pFQ1RfSUQnLFxuICBzdG9yYWdlQnVja2V0OiAnV1hUX0ZJUkVCQVNFX1NUT1JBR0VfQlVDS0VUJyxcbiAgbWVzc2FnaW5nU2VuZGVySWQ6ICdXWFRfRklSRUJBU0VfTUVTU0FHSU5HX1NFTkRFUl9JRCcsXG4gIGFwcElkOiAnV1hUX0ZJUkVCQVNFX0FQUF9JRCcsXG4gIHZhcGlkS2V5OiAnV1hUX0ZJUkVCQVNFX1ZBUElEX0tFWScsXG59IGFzIGNvbnN0O1xuXG50eXBlIEZpcmViYXNlTWVzc2FnaW5nRW52S2V5ID0ga2V5b2YgdHlwZW9mIEZJUkVCQVNFX01FU1NBR0lOR19FTlZfTUFQO1xuXG5pbnRlcmZhY2UgRmlyZWJhc2VNZXNzYWdpbmdEaWFnbm9zdGljcyB7XG4gIGhhc0NvbmZpZzogYm9vbGVhbjtcbiAgbWlzc2luZ0tleXM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlyZWJhc2VXZWJDb25maWcoKTogRmlyZWJhc2VXZWJDb25maWcge1xuICByZXR1cm4ge1xuICAgIGFwaUtleTogZW52LldYVF9GSVJFQkFTRV9BUElfS0VZID8/ICcnLFxuICAgIGF1dGhEb21haW46IGVudi5XWFRfRklSRUJBU0VfQVVUSF9ET01BSU4gPz8gJycsXG4gICAgcHJvamVjdElkOiBlbnYuV1hUX0ZJUkVCQVNFX1BST0pFQ1RfSUQgPz8gJycsXG4gICAgc3RvcmFnZUJ1Y2tldDogZW52LldYVF9GSVJFQkFTRV9TVE9SQUdFX0JVQ0tFVCA/PyAnJyxcbiAgICBtZXNzYWdpbmdTZW5kZXJJZDogZW52LldYVF9GSVJFQkFTRV9NRVNTQUdJTkdfU0VOREVSX0lEID8/ICcnLFxuICAgIGFwcElkOiBlbnYuV1hUX0ZJUkVCQVNFX0FQUF9JRCA/PyAnJyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpcmViYXNlVmFwaWRLZXkoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVudi5XWFRfRklSRUJBU0VfVkFQSURfS0VZID8/ICcnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Tm90aWZpY2F0aW9uUmVnaXN0ZXJQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBlbnYuV1hUX05PVElGSUNBVElPTl9SRUdJU1RFUl9QQVRIID8/ICcvbm90aWZpY2F0aW9ucy9yZWdpc3Rlcic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXROb3RpZmljYXRpb25WZXJpZnlQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBlbnYuV1hUX05PVElGSUNBVElPTl9WRVJJRllfUEFUSCA/PyAnL25vdGlmaWNhdGlvbnMvdmVyaWZ5Jztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0ZpcmViYXNlTWVzc2FnaW5nQ29uZmlnKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gZ2V0RmlyZWJhc2VNZXNzYWdpbmdEaWFnbm9zdGljcygpLmhhc0NvbmZpZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpcmViYXNlTWVzc2FnaW5nRGlhZ25vc3RpY3MoKTogRmlyZWJhc2VNZXNzYWdpbmdEaWFnbm9zdGljcyB7XG4gIGNvbnN0IGZpcmViYXNlQ29uZmlnID0gZ2V0RmlyZWJhc2VXZWJDb25maWcoKTtcbiAgY29uc3QgY29uZmlnVmFsdWVzOiBSZWNvcmQ8RmlyZWJhc2VNZXNzYWdpbmdFbnZLZXksIHN0cmluZz4gPSB7XG4gICAgYXBpS2V5OiBmaXJlYmFzZUNvbmZpZy5hcGlLZXksXG4gICAgYXV0aERvbWFpbjogZmlyZWJhc2VDb25maWcuYXV0aERvbWFpbixcbiAgICBwcm9qZWN0SWQ6IGZpcmViYXNlQ29uZmlnLnByb2plY3RJZCxcbiAgICBzdG9yYWdlQnVja2V0OiBmaXJlYmFzZUNvbmZpZy5zdG9yYWdlQnVja2V0LFxuICAgIG1lc3NhZ2luZ1NlbmRlcklkOiBmaXJlYmFzZUNvbmZpZy5tZXNzYWdpbmdTZW5kZXJJZCxcbiAgICBhcHBJZDogZmlyZWJhc2VDb25maWcuYXBwSWQsXG4gICAgdmFwaWRLZXk6IGdldEZpcmViYXNlVmFwaWRLZXkoKSxcbiAgfTtcbiAgY29uc3QgbWlzc2luZ0tleXMgPSAoT2JqZWN0LmVudHJpZXMoY29uZmlnVmFsdWVzKSBhcyBBcnJheTxbRmlyZWJhc2VNZXNzYWdpbmdFbnZLZXksIHN0cmluZ10+KVxuICAgIC5maWx0ZXIoKFssIHZhbHVlXTogW0ZpcmViYXNlTWVzc2FnaW5nRW52S2V5LCBzdHJpbmddKSA9PiB2YWx1ZS50cmltKCkubGVuZ3RoID09PSAwKVxuICAgIC5tYXAoKFtrZXldOiBbRmlyZWJhc2VNZXNzYWdpbmdFbnZLZXksIHN0cmluZ10pID0+IEZJUkVCQVNFX01FU1NBR0lOR19FTlZfTUFQW2tleV0pO1xuXG4gIHJldHVybiB7XG4gICAgaGFzQ29uZmlnOiBtaXNzaW5nS2V5cy5sZW5ndGggPT09IDAsXG4gICAgbWlzc2luZ0tleXMsXG4gIH07XG59XG4iLCJpbXBvcnQgeyBnZXRBcHBzLCBpbml0aWFsaXplQXBwIH0gZnJvbSAnZmlyZWJhc2UvYXBwJztcbmltcG9ydCB7IGdldE1lc3NhZ2luZywgaXNTdXBwb3J0ZWQsIHR5cGUgTWVzc2FnZVBheWxvYWQsIG9uQmFja2dyb3VuZE1lc3NhZ2UgfSBmcm9tICdmaXJlYmFzZS9tZXNzYWdpbmcvc3cnO1xuaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gJ3d4dC9icm93c2VyJztcbmltcG9ydCB7IGRlZmluZUJhY2tncm91bmQgfSBmcm9tICd3eHQvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQnO1xuXG5pbXBvcnQgeyBnZXRGaXJlYmFzZU1lc3NhZ2luZ0RpYWdub3N0aWNzLCBnZXRGaXJlYmFzZVdlYkNvbmZpZyB9IGZyb20gJy4vc2hhcmVkL2ZpcmViYXNlLWNvbmZpZy50cyc7XG5cbmNvbnN0IEZBTExCQUNLX05PVElGSUNBVElPTl9JQ09OID0gJ2RhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQUVBQUFBQkNBUUFBQUMxSEF3Q0FBQUFDMGxFUVZSNDJtUDgveDhBQXdNQ0FPN2Y3cDRBQUFBQVNVVk9SSzVDWUlJPSc7XG5jb25zdCBCQUNLR1JPVU5EX0ZDTV9MT0dfUFJFRklYID0gJ1tQdWxzYXIgRkNNXVtiYWNrZ3JvdW5kXSc7XG5cbmludGVyZmFjZSBGb3JlZ3JvdW5kTm90aWZpY2F0aW9uTWVzc2FnZSB7XG4gIHR5cGU6ICdQVUxTQVIvRkNNX0ZPUkVHUk9VTkRfTUVTU0FHRSc7XG4gIG5vdGlmaWNhdGlvbj86IHtcbiAgICB0aXRsZT86IHN0cmluZztcbiAgICBib2R5Pzogc3RyaW5nO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKCgpID0+IHtcbiAgY29uc29sZS5pbmZvKGAke0JBQ0tHUk9VTkRfRkNNX0xPR19QUkVGSVh9IEJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgc3RhcnRlZC5gKTtcblxuICB2b2lkIGJyb3dzZXIuc2lkZVBhbmVsPy5zZXRQYW5lbEJlaGF2aW9yKHsgb3BlblBhbmVsT25BY3Rpb25DbGljazogdHJ1ZSB9KTtcblxuICB2b2lkIGluaXRpYWxpemVGaXJlYmFzZU1lc3NhZ2luZygpLmNhdGNoKChlcnJvcjogdW5rbm93bikgPT4ge1xuICAgIGNvbnNvbGUuZXJyb3IoYCR7QkFDS0dST1VORF9GQ01fTE9HX1BSRUZJWH0gRmFpbGVkIHRvIGluaXRpYWxpemUgRmlyZWJhc2UgTWVzc2FnaW5nLmAsIGVycm9yKTtcbiAgfSk7XG5cbiAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZTogdW5rbm93bikgPT4ge1xuICAgIGlmICghaXNGb3JlZ3JvdW5kTm90aWZpY2F0aW9uTWVzc2FnZShtZXNzYWdlKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnNvbGUuaW5mbyhgJHtCQUNLR1JPVU5EX0ZDTV9MT0dfUFJFRklYfSBSZWNlaXZlZCBmb3JlZ3JvdW5kIHJlbGF5IG1lc3NhZ2UuYCwgbWVzc2FnZSk7XG5cbiAgICBjb25zdCB0aXRsZSA9IG1lc3NhZ2Uubm90aWZpY2F0aW9uPy50aXRsZSA/PyAnUHVsc2FyIE5vdGlmaWNhdGlvbic7XG4gICAgY29uc3QgYm9keSA9IG1lc3NhZ2Uubm90aWZpY2F0aW9uPy5ib2R5ID8/ICdZb3UgaGF2ZSBhIG5ldyBtZXNzYWdlLic7XG4gICAgdm9pZCBjcmVhdGVFeHRlbnNpb25Ob3RpZmljYXRpb24odGl0bGUsIGJvZHkpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59KTtcblxuYXN5bmMgZnVuY3Rpb24gaW5pdGlhbGl6ZUZpcmViYXNlTWVzc2FnaW5nKCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBkaWFnbm9zdGljcyA9IGdldEZpcmViYXNlTWVzc2FnaW5nRGlhZ25vc3RpY3MoKTtcbiAgaWYgKCFkaWFnbm9zdGljcy5oYXNDb25maWcpIHtcbiAgICBjb25zb2xlLndhcm4oYCR7QkFDS0dST1VORF9GQ01fTE9HX1BSRUZJWH0gRmlyZWJhc2UgTWVzc2FnaW5nIGNvbmZpZyBpcyBpbmNvbXBsZXRlLmAsIGRpYWdub3N0aWNzKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBzdXBwb3J0ZWQgPSBhd2FpdCBpc1N1cHBvcnRlZCgpO1xuICBpZiAoIXN1cHBvcnRlZCkge1xuICAgIGNvbnNvbGUud2FybihgJHtCQUNLR1JPVU5EX0ZDTV9MT0dfUFJFRklYfSBGaXJlYmFzZSBNZXNzYWdpbmcgaXMgbm90IHN1cHBvcnRlZCBpbiB0aGUgYmFja2dyb3VuZCBjb250ZXh0LmApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGZpcmViYXNlQXBwID0gZ2V0QXBwcygpWzBdID8/IGluaXRpYWxpemVBcHAoZ2V0RmlyZWJhc2VXZWJDb25maWcoKSk7XG4gIGNvbnN0IG1lc3NhZ2luZyA9IGdldE1lc3NhZ2luZyhmaXJlYmFzZUFwcCk7XG5cbiAgY29uc29sZS5pbmZvKGAke0JBQ0tHUk9VTkRfRkNNX0xPR19QUkVGSVh9IEZpcmViYXNlIE1lc3NhZ2luZyBpbml0aWFsaXplZC4gV2FpdGluZyBmb3IgYmFja2dyb3VuZCBwYXlsb2Fkcy5gKTtcblxuICBvbkJhY2tncm91bmRNZXNzYWdlKG1lc3NhZ2luZywgKHBheWxvYWQ6IE1lc3NhZ2VQYXlsb2FkKSA9PiB7XG4gICAgY29uc29sZS5pbmZvKGAke0JBQ0tHUk9VTkRfRkNNX0xPR19QUkVGSVh9IFJlY2VpdmVkIGJhY2tncm91bmQgcGF5bG9hZC5gLCBwYXlsb2FkKTtcblxuICAgIGNvbnN0IHRpdGxlID0gcGF5bG9hZC5ub3RpZmljYXRpb24/LnRpdGxlID8/IHBheWxvYWQuZGF0YT8udGl0bGUgPz8gJ1B1bHNhciBOb3RpZmljYXRpb24nO1xuICAgIGNvbnN0IGJvZHkgPSBwYXlsb2FkLm5vdGlmaWNhdGlvbj8uYm9keSA/PyBwYXlsb2FkLmRhdGE/LmJvZHkgPz8gJ1lvdSBoYXZlIGEgbmV3IG1lc3NhZ2UuJztcbiAgICB2b2lkIGNyZWF0ZUV4dGVuc2lvbk5vdGlmaWNhdGlvbih0aXRsZSwgYm9keSk7XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVFeHRlbnNpb25Ob3RpZmljYXRpb24odGl0bGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghYnJvd3Nlci5ub3RpZmljYXRpb25zKSB7XG4gICAgY29uc29sZS53YXJuKGAke0JBQ0tHUk9VTkRfRkNNX0xPR19QUkVGSVh9IE5vdGlmaWNhdGlvbnMgQVBJIGlzIHVuYXZhaWxhYmxlLmAsIHsgdGl0bGUsIG1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc29sZS5pbmZvKGAke0JBQ0tHUk9VTkRfRkNNX0xPR19QUkVGSVh9IENyZWF0aW5nIGV4dGVuc2lvbiBub3RpZmljYXRpb24uYCwgeyB0aXRsZSwgbWVzc2FnZSB9KTtcblxuICBhd2FpdCBicm93c2VyLm5vdGlmaWNhdGlvbnMuY3JlYXRlKHtcbiAgICB0eXBlOiAnYmFzaWMnLFxuICAgIHRpdGxlLFxuICAgIG1lc3NhZ2UsXG4gICAgaWNvblVybDogRkFMTEJBQ0tfTk9USUZJQ0FUSU9OX0lDT04sXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpc0ZvcmVncm91bmROb3RpZmljYXRpb25NZXNzYWdlKG1lc3NhZ2U6IHVua25vd24pOiBtZXNzYWdlIGlzIEZvcmVncm91bmROb3RpZmljYXRpb25NZXNzYWdlIHtcbiAgaWYgKCFtZXNzYWdlIHx8IHR5cGVvZiBtZXNzYWdlICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiAobWVzc2FnZSBhcyB7IHR5cGU/OiBzdHJpbmcgfSkudHlwZSA9PT0gJ1BVTFNBUi9GQ01fRk9SRUdST1VORF9NRVNTQUdFJztcbn1cbiIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsibmFtZSIsIkRFRkFVTFRfRU5UUllfTkFNRSIsIkxvZ0xldmVsIiwidmVyc2lvbiIsInRhcmdldCIsInZlcnNpb24kMSIsImxvZ2dlciIsIm5hbWUkMSIsIkVSUk9SX0ZBQ1RPUlkiLCJkYlByb21pc2UiLCJnZXREYlByb21pc2UiLCJyZXN1bHQiLCJnZXRIZWFkZXJzIiwic2xlZXAiLCJnZXRLZXkiLCJEQVRBQkFTRV9OQU1FIiwiREFUQUJBU0VfVkVSU0lPTiIsIk9CSkVDVF9TVE9SRV9OQU1FIiwiaW5zdGFsbGF0aW9uRW50cnkiLCJleHRyYWN0QXBwQ29uZmlnIiwiZ2V0TWlzc2luZ1ZhbHVlRXJyb3IiLCJNZXNzYWdlVHlwZSIsImJhc2U2NCIsImRiIiwiYnJvd3NlciIsImlzU3VwcG9ydGVkIiwiZ2V0TWVzc2FnaW5nIl0sIm1hcHBpbmdzIjoiOztBQWlCQSxRQUFNLDZCQUE2QixNQUFNO0FDcUV6QyxRQUFNLHNCQUFzQixTQUFVLEtBQUs7QUFFdkMsVUFBTSxNQUFNLENBQUE7QUFDWixRQUFJLElBQUk7QUFDUixhQUFTLElBQUksR0FBRyxJQUFJLElBQUksUUFBUSxLQUFLO0FBQ2pD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LFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU0sU0FBUztBQUVmLFFBQU1DLFdBQVM7QUFFZixRQUFNUCxTQUFPO0FBd0JiLFFBQU0scUJBQXFCO0FBQzNCLFFBQU0sc0JBQXNCO0FBQUEsSUFDeEIsQ0FBQyxNQUFNLEdBQUc7QUFBQSxJQUNWLENBQUMsTUFBTSxHQUFHO0FBQUEsSUFDVixDQUFDLE1BQU0sR0FBRztBQUFBLElBQ1YsQ0FBQyxNQUFNLEdBQUc7QUFBQSxJQUNWLENBQUMsTUFBTSxHQUFHO0FBQUEsSUFDVixDQUFDLE1BQU0sR0FBRztBQUFBLElBQ1YsQ0FBQyxNQUFNLEdBQUc7QUFBQSxJQUNWLENBQUMsTUFBTSxHQUFHO0FBQUEsSUFDVixDQUFDLE1BQU0sR0FBRztBQUFBLElBQ1YsQ0FBQyxNQUFNLEdBQUc7QUFBQSxJQUNWLENBQUMsTUFBTSxHQUFHO0FBQUEsSUFDVixDQUFDLE1BQU0sR0FBRztBQUFBLElBQ1YsQ0FBQyxNQUFNLEdBQUc7QUFBQSxJQUNWLENBQUMsTUFBTSxHQUFHO0FBQUEsSUFDVixDQUFDLE1BQU0sR0FBRztBQUFBLElBQ1YsQ0FBQyxNQUFNLEdBQUc7QUFBQSxJQUNWLENBQUMsTUFBTSxHQUFHO0FBQUEsSUFDVixDQUFDLE1BQU0sR0FBRztBQUFBLElBQ1YsQ0FBQyxNQUFNLEdBQUc7QUFBQSxJQUNWLENBQUMsTUFBTSxHQUFHO0FBQUEsSUFDVixDQUFDLE1BQU0sR0FBRztBQUFBLElBQ1YsQ0FBQyxNQUFNLEdBQUc7QUFBQSxJQUNWLENBQUMsTUFBTSxHQUFHO0FBQUEsSUFDVixDQUFDLE1BQU0sR0FBRztBQUFBLElBQ1YsQ0FBQ08sUUFBTSxHQUFH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
