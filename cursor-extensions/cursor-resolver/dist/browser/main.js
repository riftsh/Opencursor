/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(__webpack_require__(1));
const backgroundComposerRemoteAuthorityResolver_js_1 = __webpack_require__(2);
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel('Cursor Resolver');
    context.subscriptions.push(outputChannel);
    const isNode = typeof process !== 'undefined' && !!process.versions?.node;
    outputChannel.appendLine(`[cursor-resolver] Running in ${isNode ? 'Node.js' : 'web-worker'} extension host`);
    const remoteAuthorityResolver = new backgroundComposerRemoteAuthorityResolver_js_1.BackgroundComposerAuthorityResolver(vscode.cursor.connectionTokenProvider, outputChannel);
    context.subscriptions.push(vscode.workspace.registerRemoteAuthorityResolver('background-composer', remoteAuthorityResolver));
}
function deactivate() {
    // Disposables are cleaned up via context.subscriptions
}


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BackgroundComposerAuthorityResolver = void 0;
const vscode = __importStar(__webpack_require__(1));
const cursorSocketCloseError_js_1 = __webpack_require__(3);
const cursorServerUrlRetry_js_1 = __webpack_require__(4);
function toTemporarilyNotAvailableIfCursorSocketTransient(error) {
    if (!(error instanceof Error)) {
        return error;
    }
    if (error.code === cursorSocketCloseError_js_1.CURSOR_SOCKET_CLOSE_ERROR_CODE_TRANSIENT) {
        return vscode.RemoteAuthorityResolverError.TemporarilyNotAvailable(error.message);
    }
    return error;
}
// ── Logging (backed by output channel) ──────────────────────────
let _outputChannel;
function initLogger(outputChannel) {
    _outputChannel = outputChannel;
}
function log(...args) {
    const msg = args.map(String).join(' ');
    console.log(`[cursor-resolver]  ${msg}`);
    _outputChannel?.appendLine(`[INFO]  ${msg}`);
}
function logError(...args) {
    const msg = args.map(String).join(' ');
    _outputChannel?.appendLine(`[ERROR] ${msg}`);
}
// ── Helpers ──────────────────────────────────────────────────────
/**
 * Check if a port is in the reserved range for cursor-server infrastructure.
 * We reserve the entire 26xxx range (26000-26999) to ensure we can
 * add new ports to it later if needed without conflicts.
 */
function isCursorServerReservedPort(port) {
    return port >= 26000 && port <= 26999;
}
function isFilteredBackgroundComposerPort(port) {
    if (isCursorServerReservedPort(port)) {
        return true;
    }
    // Filter known internal/service ports from candidate forwards.
    if (port >= 5870 && port <= 5890) {
        return true;
    }
    if (port === 2375 || port === 5901 || port === 50052) {
        return true;
    }
    return false;
}
function getProductCommit() {
    const commit = vscode.cursor.productCommit ?? vscode.cursor.cursorServerCommit;
    if (!commit || !/^[a-zA-Z0-9\-_.]+$/.test(commit)) {
        logError('Invalid or missing product commit', commit);
        throw new Error('Invalid or missing product commit');
    }
    return commit;
}
// ── Metrics ─────────────────────────────────────────────────────
function reportMetric(name, value) {
    try {
        vscode.cursor.metricsDistribution({
            stat: `background-composer.${name}`,
            value,
            tags: {},
        });
    }
    catch {
        // Metrics are best-effort
    }
}
// ── Resolver ────────────────────────────────────────────────────
class BackgroundComposerAuthorityResolver {
    constructor(connectionTokenProvider, outputChannel) {
        this.connectionTokenProvider = connectionTokenProvider;
        this.alwaysShowPortsView = true;
        initLogger(outputChannel);
        log('RemoteAuthorityResolver constructor');
    }
    createManagedResolvedAuthority(makeConnection, connectionToken, tunnelFactory) {
        return Object.assign(new vscode.ManagedResolvedAuthority(makeConnection, connectionToken, tunnelFactory), {
            skipCreateInspectTunnel: true,
        });
    }
    /**
     * Filter out cursor-server reserved ports from being shown as candidates.
     * These ports (26000-26999) are used by cursor-server infrastructure and
     * should not be offered as port forwards in background composers.
     */
    async showCandidatePort(_host, port, _detail) {
        if (isFilteredBackgroundComposerPort(port)) {
            log(`Filtering out reserved/internal port ${port} from candidates`);
            return false;
        }
        return true;
    }
    async getCursorServerUrl(authority, useCache = true) {
        const indexOfPlus = authority.indexOf('+');
        const bcIdOrUrl = authority.substring(indexOfPlus + 1).trim();
        if (indexOfPlus === -1 || bcIdOrUrl.length === 0) {
            throw new Error('No bcId found in authority');
        }
        if (bcIdOrUrl.startsWith('{')) {
            try {
                return JSON.parse(bcIdOrUrl);
            }
            catch (e) {
                throw new Error('Invalid url found in authority');
            }
        }
        const bcId = bcIdOrUrl;
        const commit = getProductCommit();
        return await withTimer('getCursorServerUrl', async () => {
            try {
                return await this.connectionTokenProvider.getOrCreateCursorServerUrl(bcId, commit, useCache);
            }
            catch (error) {
                logError('Error getting cursor server url', error);
                throw error;
            }
        });
    }
    async getCursorServerUrlWithRetry(authority, initialUseCache = true) {
        return (0, cursorServerUrlRetry_js_1.retryGetCursorServerUrl)({
            initialUseCache,
            getCursorServerUrl: useCache => this.getCursorServerUrl(authority, useCache),
            onRetry: (error, attempt, delayMs) => {
                const delayDescription = delayMs > 0 ? `retrying in ${delayMs / 1000}s` : 'retrying immediately';
                log('Error getting cursor server url,', delayDescription, `attempt=${attempt}`, error);
            },
        });
    }
    async resolve(authority, context, progress) {
        return withTimer('resolve', async () => {
            log('resolve', authority, `resolveAttempt=${context.resolveAttempt}`);
            progress?.report({ phase: 'init' });
            // Parse bcId from authority
            const indexOfPlus = authority.indexOf('+');
            const bcIdOrUrl = authority.substring(indexOfPlus + 1).trim();
            if (indexOfPlus === -1 || bcIdOrUrl.length === 0) {
                throw new Error('No bcId found in authority');
            }
            // If the authority contains an inline JSON URL, resolve immediately
            if (bcIdOrUrl.startsWith('{')) {
                let url;
                try {
                    url = JSON.parse(bcIdOrUrl);
                }
                catch (e) {
                    throw new Error('Invalid url found in authority');
                }
                log('resolved url (inline)', url.host, url.port);
                const makeConnection = async () => {
                    try {
                        return await createManagedTcpConnection(url);
                    }
                    catch (error) {
                        throw toTemporarilyNotAvailableIfCursorSocketTransient(error);
                    }
                };
                const tunnelFactory = vscode.cursor.createSocketConsumerTunnelFactory({
                    makeConnection,
                    connectionToken: url.connectionToken,
                });
                return this.createManagedResolvedAuthority(makeConnection, url.connectionToken, tunnelFactory);
            }
            const bcId = bcIdOrUrl;
            // Atomically get-or-create the connection token.  Both the
            // warmup service and the resolver funnel through the same
            // getOrCreateConnectionToken call, so they always converge on
            // the same token for a given (bcId, commit) pair.
            progress?.report({ phase: 'auth' });
            const commit = getProductCommit();
            const { connectionToken } = await this.connectionTokenProvider.getOrCreateConnectionToken(bcId, commit);
            progress?.report({ phase: 'get-url' });
            const urlPromise = this.getCursorServerUrlWithRetry(authority, context.resolveAttempt < 3);
            const makeConnection = async () => {
                progress?.report({ phase: 'connect' });
                const url = await urlPromise;
                log('resolved url', url.host, url.port);
                progress?.report({ phase: 'socket' });
                try {
                    return await createManagedTcpConnection(url);
                }
                catch (error) {
                    throw toTemporarilyNotAvailableIfCursorSocketTransient(error);
                }
            };
            const tunnelFactory = vscode.cursor.createSocketConsumerTunnelFactory({
                makeConnection,
                connectionToken,
            });
            return this.createManagedResolvedAuthority(makeConnection, connectionToken, tunnelFactory);
        });
    }
}
exports.BackgroundComposerAuthorityResolver = BackgroundComposerAuthorityResolver;
// ── TCP-based managed connection ────────────────────────────────
/**
 * Creates a managed connection backed by a raw TCP (or TLS) socket
 * to the cursor-server, obtained via the registered SocketProvider.
 *
 * Custom headers and the `doNotIncludeWsLocalhostPrefix` flag are
 * passed through `connectionOptions` so VS Code's managed socket
 * layer builds the correct HTTP upgrade request itself.
 */
async function createManagedTcpConnection(url) {
    const useTls = url.port === 443;
    const tcpConn = await vscode.cursor.createTcpConnection({
        host: url.host,
        port: url.port,
        tls: useTls ? { rejectUnauthorized: true, servername: url.host } : undefined,
    });
    log('tcp connection established', `${url.host}:${url.port}`, useTls ? '(tls)' : '(plain)');
    const dataEmitter = new vscode.EventEmitter();
    const closeEmitter = new vscode.EventEmitter();
    const endEmitter = new vscode.EventEmitter();
    tcpConn.onDidReceiveData(data => dataEmitter.fire(data));
    tcpConn.onDidClose(err => {
        closeEmitter.fire(err);
        endEmitter.fire();
    });
    return {
        onDidReceiveMessage: dataEmitter.event,
        onDidClose: closeEmitter.event,
        onDidEnd: endEmitter.event,
        send: (data) => {
            tcpConn.send(data);
        },
        end: () => {
            tcpConn.close();
        },
        connectionOptions: {
            headers: [
                `Host: ${url.host}:${url.port}`,
                ...url.headers.map((h) => `${h.key}: ${h.value}`),
            ],
            doNotIncludeWsLocalhostPrefix: true,
        },
    };
}
// ── Timer ───────────────────────────────────────────────────────
async function withTimer(name, fn) {
    const start = performance.now();
    try {
        return await fn();
    }
    finally {
        const end = performance.now();
        reportMetric(name, end - start);
    }
}


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CURSOR_SOCKET_CLOSE_ERROR_CODE_TRANSIENT = void 0;
exports.CURSOR_SOCKET_CLOSE_ERROR_CODE_TRANSIENT = 'CursorSocketTransient';


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getCursorServerUrlRetryDelayMs = getCursorServerUrlRetryDelayMs;
exports.shouldRetryCursorServerUrlError = shouldRetryCursorServerUrlError;
exports.retryGetCursorServerUrl = retryGetCursorServerUrl;
const connect_1 = __webpack_require__(5);
const CURSOR_SERVER_URL_RETRY_DELAYS_MS = [
    0,
    5000,
    5000,
    10000,
    10000,
    10000,
    30000,
    30000,
    60000,
];
function getCursorServerUrlRetryDelayMs(attempt) {
    return CURSOR_SERVER_URL_RETRY_DELAYS_MS[Math.min(attempt, CURSOR_SERVER_URL_RETRY_DELAYS_MS.length - 1)];
}
function shouldRetryCursorServerUrlError(error) {
    const code = getConnectErrorCode(error);
    return code === connect_1.Code.DeadlineExceeded || code === connect_1.Code.Unavailable;
}
async function retryGetCursorServerUrl({ getCursorServerUrl, initialUseCache, sleep = defaultSleep, onRetry, }) {
    let useCache = initialUseCache;
    for (let attempt = 0;; attempt++) {
        try {
            return await getCursorServerUrl(useCache);
        }
        catch (error) {
            if (!shouldRetryCursorServerUrlError(error)) {
                throw error;
            }
            const delayMs = getCursorServerUrlRetryDelayMs(attempt);
            onRetry?.(error, attempt + 1, delayMs);
            if (delayMs > 0) {
                await sleep(delayMs);
            }
            useCache = false;
        }
    }
}
async function defaultSleep(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
}
function getConnectErrorCode(error) {
    if (error instanceof connect_1.ConnectError) {
        return error.code;
    }
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return undefined;
    }
    return typeof error.code === 'number' ? error.code : undefined;
}


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createRouterTransport = exports.createMethodImplSpec = exports.createServiceImplSpec = exports.makeAnyClient = exports.createContextValues = exports.createContextKey = exports.cors = exports.createHandlerContext = exports.createConnectRouter = exports.createPromiseClient = exports.createClient = exports.createCallbackClient = exports.appendHeaders = exports.decodeBinaryHeader = exports.encodeBinaryHeader = exports.Code = exports.ConnectError = void 0;
var connect_error_js_1 = __webpack_require__(6);
Object.defineProperty(exports, "ConnectError", ({ enumerable: true, get: function () { return connect_error_js_1.ConnectError; } }));
var code_js_1 = __webpack_require__(7);
Object.defineProperty(exports, "Code", ({ enumerable: true, get: function () { return code_js_1.Code; } }));
var http_headers_js_1 = __webpack_require__(9);
Object.defineProperty(exports, "encodeBinaryHeader", ({ enumerable: true, get: function () { return http_headers_js_1.encodeBinaryHeader; } }));
Object.defineProperty(exports, "decodeBinaryHeader", ({ enumerable: true, get: function () { return http_headers_js_1.decodeBinaryHeader; } }));
Object.defineProperty(exports, "appendHeaders", ({ enumerable: true, get: function () { return http_headers_js_1.appendHeaders; } }));
var callback_client_js_1 = __webpack_require__(59);
Object.defineProperty(exports, "createCallbackClient", ({ enumerable: true, get: function () { return callback_client_js_1.createCallbackClient; } }));
var promise_client_js_1 = __webpack_require__(65);
Object.defineProperty(exports, "createClient", ({ enumerable: true, get: function () { return promise_client_js_1.createClient; } }));
Object.defineProperty(exports, "createPromiseClient", ({ enumerable: true, get: function () { return promise_client_js_1.createPromiseClient; } }));
var router_js_1 = __webpack_require__(66);
Object.defineProperty(exports, "createConnectRouter", ({ enumerable: true, get: function () { return router_js_1.createConnectRouter; } }));
var implementation_js_1 = __webpack_require__(67);
Object.defineProperty(exports, "createHandlerContext", ({ enumerable: true, get: function () { return implementation_js_1.createHandlerContext; } }));
var cors_js_1 = __webpack_require__(98);
Object.defineProperty(exports, "cors", ({ enumerable: true, get: function () { return cors_js_1.cors; } }));
var context_values_js_1 = __webpack_require__(69);
Object.defineProperty(exports, "createContextKey", ({ enumerable: true, get: function () { return context_values_js_1.createContextKey; } }));
Object.defineProperty(exports, "createContextValues", ({ enumerable: true, get: function () { return context_values_js_1.createContextValues; } }));
// Symbols above should be relevant to end users.
// Symbols below should only be relevant for other libraries.
var any_client_js_1 = __webpack_require__(60);
Object.defineProperty(exports, "makeAnyClient", ({ enumerable: true, get: function () { return any_client_js_1.makeAnyClient; } }));
var implementation_js_2 = __webpack_require__(67);
Object.defineProperty(exports, "createServiceImplSpec", ({ enumerable: true, get: function () { return implementation_js_2.createServiceImplSpec; } }));
Object.defineProperty(exports, "createMethodImplSpec", ({ enumerable: true, get: function () { return implementation_js_2.createMethodImplSpec; } }));
var router_transport_js_1 = __webpack_require__(99);
Object.defineProperty(exports, "createRouterTransport", ({ enumerable: true, get: function () { return router_transport_js_1.createRouterTransport; } }));


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ConnectError = void 0;
const code_js_1 = __webpack_require__(7);
const code_string_js_1 = __webpack_require__(8);
/**
 * ConnectError captures four pieces of information: a Code, an error
 * message, an optional cause of the error, and an optional collection of
 * arbitrary Protobuf messages called  "details".
 *
 * Because developer tools typically show just the error message, we prefix
 * it with the status code, so that the most important information is always
 * visible immediately.
 *
 * Error details are wrapped with google.protobuf.Any on the wire, so that
 * a server or middleware can attach arbitrary data to an error. Use the
 * method findDetails() to retrieve the details.
 */
class ConnectError extends Error {
    /**
     * Create a new ConnectError.
     * If no code is provided, code "unknown" is used.
     * Outgoing details are only relevant for the server side - a service may
     * raise an error with details, and it is up to the protocol implementation
     * to encode and send the details along with error.
     */
    constructor(message, code = code_js_1.Code.Unknown, metadata, outgoingDetails, cause) {
        super(createMessage(message, code));
        this.name = "ConnectError";
        // see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#example
        Object.setPrototypeOf(this, new.target.prototype);
        this.rawMessage = message;
        this.code = code;
        this.metadata = new Headers(metadata !== null && metadata !== void 0 ? metadata : {});
        this.details = outgoingDetails !== null && outgoingDetails !== void 0 ? outgoingDetails : [];
        this.cause = cause;
    }
    /**
     * Convert any value - typically a caught error into a ConnectError,
     * following these rules:
     * - If the value is already a ConnectError, return it as is.
     * - If the value is an AbortError from the fetch API, return the message
     *   of the AbortError with code Canceled.
     * - For other Errors, return the error message with code Unknown by default.
     * - For other values, return the values String representation as a message,
     *   with the code Unknown by default.
     * The original value will be used for the "cause" property for the new
     * ConnectError.
     */
    static from(reason, code = code_js_1.Code.Unknown) {
        if (reason instanceof ConnectError) {
            return reason;
        }
        if (reason instanceof Error) {
            if (reason.name == "AbortError") {
                // Fetch requests can only be canceled with an AbortController.
                // We detect that condition by looking at the name of the raised
                // error object, and translate to the appropriate status code.
                return new ConnectError(reason.message, code_js_1.Code.Canceled);
            }
            return new ConnectError(reason.message, code, undefined, undefined, reason);
        }
        return new ConnectError(String(reason), code, undefined, undefined, reason);
    }
    static [Symbol.hasInstance](v) {
        if (!(v instanceof Error)) {
            return false;
        }
        if (Object.getPrototypeOf(v) === ConnectError.prototype) {
            return true;
        }
        return (v.name === "ConnectError" &&
            "code" in v &&
            typeof v.code === "number" &&
            "metadata" in v &&
            "details" in v &&
            Array.isArray(v.details) &&
            "rawMessage" in v &&
            typeof v.rawMessage == "string" &&
            "cause" in v);
    }
    findDetails(typeOrRegistry) {
        const registry = "typeName" in typeOrRegistry
            ? {
                findMessage: (typeName) => typeName === typeOrRegistry.typeName ? typeOrRegistry : undefined,
            }
            : typeOrRegistry;
        const details = [];
        for (const data of this.details) {
            if ("getType" in data) {
                if (registry.findMessage(data.getType().typeName)) {
                    details.push(data);
                }
                continue;
            }
            const type = registry.findMessage(data.type);
            if (type) {
                try {
                    details.push(type.fromBinary(data.value));
                }
                catch (_) {
                    // We silently give up if we are unable to parse the detail, because
                    // that appears to be the least worst behavior.
                    // It is very unlikely that a user surrounds a catch body handling the
                    // error with another try-catch statement, and we do not want to
                    // recommend doing so.
                }
            }
        }
        return details;
    }
}
exports.ConnectError = ConnectError;
/**
 * Create an error message, prefixing the given code.
 */
function createMessage(message, code) {
    return message.length
        ? `[${(0, code_string_js_1.codeToString)(code)}] ${message}`
        : `[${(0, code_string_js_1.codeToString)(code)}]`;
}


/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Code = void 0;
/**
 * Connect represents categories of errors as codes, and each code maps to a
 * specific HTTP status code. The codes and their semantics were chosen to
 * match gRPC. Only the codes below are valid — there are no user-defined
 * codes.
 *
 * See the specification at https://connectrpc.com/docs/protocol#error-codes
 * for details.
 */
var Code;
(function (Code) {
    /**
     * Canceled, usually be the user
     */
    Code[Code["Canceled"] = 1] = "Canceled";
    /**
     * Unknown error
     */
    Code[Code["Unknown"] = 2] = "Unknown";
    /**
     * Argument invalid regardless of system state
     */
    Code[Code["InvalidArgument"] = 3] = "InvalidArgument";
    /**
     * Operation expired, may or may not have completed.
     */
    Code[Code["DeadlineExceeded"] = 4] = "DeadlineExceeded";
    /**
     * Entity not found.
     */
    Code[Code["NotFound"] = 5] = "NotFound";
    /**
     * Entity already exists.
     */
    Code[Code["AlreadyExists"] = 6] = "AlreadyExists";
    /**
     * Operation not authorized.
     */
    Code[Code["PermissionDenied"] = 7] = "PermissionDenied";
    /**
     * Quota exhausted.
     */
    Code[Code["ResourceExhausted"] = 8] = "ResourceExhausted";
    /**
     * Argument invalid in current system state.
     */
    Code[Code["FailedPrecondition"] = 9] = "FailedPrecondition";
    /**
     * Operation aborted.
     */
    Code[Code["Aborted"] = 10] = "Aborted";
    /**
     * Out of bounds, use instead of FailedPrecondition.
     */
    Code[Code["OutOfRange"] = 11] = "OutOfRange";
    /**
     * Operation not implemented or disabled.
     */
    Code[Code["Unimplemented"] = 12] = "Unimplemented";
    /**
     * Internal error, reserved for "serious errors".
     */
    Code[Code["Internal"] = 13] = "Internal";
    /**
     * Unavailable, client should back off and retry.
     */
    Code[Code["Unavailable"] = 14] = "Unavailable";
    /**
     * Unrecoverable data loss or corruption.
     */
    Code[Code["DataLoss"] = 15] = "DataLoss";
    /**
     * Request isn't authenticated.
     */
    Code[Code["Unauthenticated"] = 16] = "Unauthenticated";
})(Code || (exports.Code = Code = {}));


/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.codeToString = codeToString;
exports.codeFromString = codeFromString;
const code_js_1 = __webpack_require__(7);
/**
 * codeToString returns the string representation of a Code.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function codeToString(value) {
    const name = code_js_1.Code[value];
    if (typeof name != "string") {
        return value.toString();
    }
    return (name[0].toLowerCase() +
        name.substring(1).replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()));
}
let stringToCode;
/**
 * codeFromString parses the string representation of a Code in snake_case.
 * For example, the string "permission_denied" parses into Code.PermissionDenied.
 *
 * If the given string cannot be parsed, the function returns undefined.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function codeFromString(value) {
    if (!stringToCode) {
        stringToCode = {};
        for (const value of Object.values(code_js_1.Code)) {
            if (typeof value == "string") {
                continue;
            }
            stringToCode[codeToString(value)] = value;
        }
    }
    return stringToCode[value];
}


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.encodeBinaryHeader = encodeBinaryHeader;
exports.decodeBinaryHeader = decodeBinaryHeader;
exports.appendHeaders = appendHeaders;
const protobuf_1 = __webpack_require__(10);
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
/**
 * Encode a single binary header value according to the Connect
 * and gRPC specifications.
 *
 * This function accepts raw binary data from a buffer, a string
 * with UTF-8 text, or a protobuf message. It encodes the input
 * with unpadded base64 and returns a string that can be used for
 * a header whose name ends with `-bin`.
 */
function encodeBinaryHeader(value) {
    let bytes;
    if (typeof value == "object" && "getType" in value) {
        bytes = value.toBinary();
    }
    else if (typeof value == "string") {
        bytes = new TextEncoder().encode(value);
    }
    else {
        bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    }
    return protobuf_1.protoBase64.enc(bytes).replace(/=+$/, "");
}
function decodeBinaryHeader(value, type, options) {
    try {
        const bytes = protobuf_1.protoBase64.dec(value);
        if (type) {
            return type.fromBinary(bytes, options);
        }
        return bytes;
    }
    catch (e) {
        throw connect_error_js_1.ConnectError.from(e, code_js_1.Code.DataLoss);
    }
}
/**
 * Merge two or more Headers objects by appending all fields from
 * all inputs to a new Headers object.
 */
function appendHeaders(...headers) {
    const h = new Headers();
    for (const e of headers) {
        e.forEach((value, key) => {
            h.append(key, value);
        });
    }
    return h;
}


/***/ }),
/* 10 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toPlainMessage = exports.createRegistryFromDescriptors = exports.createMutableRegistry = exports.createRegistry = exports.createDescriptorSet = exports.BinaryReader = exports.BinaryWriter = exports.WireType = exports.MethodIdempotency = exports.MethodKind = exports.clearExtension = exports.hasExtension = exports.setExtension = exports.getExtension = exports.ScalarType = exports.LongType = exports.isMessage = exports.Message = exports.codegenInfo = exports.protoDelimited = exports.protoBase64 = exports.protoInt64 = exports.protoDouble = exports.proto2 = exports.proto3 = void 0;
var proto3_js_1 = __webpack_require__(11);
Object.defineProperty(exports, "proto3", ({ enumerable: true, get: function () { return proto3_js_1.proto3; } }));
var proto2_js_1 = __webpack_require__(35);
Object.defineProperty(exports, "proto2", ({ enumerable: true, get: function () { return proto2_js_1.proto2; } }));
var proto_double_js_1 = __webpack_require__(36);
Object.defineProperty(exports, "protoDouble", ({ enumerable: true, get: function () { return proto_double_js_1.protoDouble; } }));
var proto_int64_js_1 = __webpack_require__(19);
Object.defineProperty(exports, "protoInt64", ({ enumerable: true, get: function () { return proto_int64_js_1.protoInt64; } }));
var proto_base64_js_1 = __webpack_require__(23);
Object.defineProperty(exports, "protoBase64", ({ enumerable: true, get: function () { return proto_base64_js_1.protoBase64; } }));
var proto_delimited_js_1 = __webpack_require__(37);
Object.defineProperty(exports, "protoDelimited", ({ enumerable: true, get: function () { return proto_delimited_js_1.protoDelimited; } }));
var codegen_info_js_1 = __webpack_require__(38);
Object.defineProperty(exports, "codegenInfo", ({ enumerable: true, get: function () { return codegen_info_js_1.codegenInfo; } }));
var message_js_1 = __webpack_require__(16);
Object.defineProperty(exports, "Message", ({ enumerable: true, get: function () { return message_js_1.Message; } }));
var is_message_js_1 = __webpack_require__(27);
Object.defineProperty(exports, "isMessage", ({ enumerable: true, get: function () { return is_message_js_1.isMessage; } }));
var scalar_js_1 = __webpack_require__(21);
Object.defineProperty(exports, "LongType", ({ enumerable: true, get: function () { return scalar_js_1.LongType; } }));
Object.defineProperty(exports, "ScalarType", ({ enumerable: true, get: function () { return scalar_js_1.ScalarType; } }));
var extension_accessor_js_1 = __webpack_require__(24);
Object.defineProperty(exports, "getExtension", ({ enumerable: true, get: function () { return extension_accessor_js_1.getExtension; } }));
Object.defineProperty(exports, "setExtension", ({ enumerable: true, get: function () { return extension_accessor_js_1.setExtension; } }));
Object.defineProperty(exports, "hasExtension", ({ enumerable: true, get: function () { return extension_accessor_js_1.hasExtension; } }));
Object.defineProperty(exports, "clearExtension", ({ enumerable: true, get: function () { return extension_accessor_js_1.clearExtension; } }));
var service_type_js_1 = __webpack_require__(40);
Object.defineProperty(exports, "MethodKind", ({ enumerable: true, get: function () { return service_type_js_1.MethodKind; } }));
Object.defineProperty(exports, "MethodIdempotency", ({ enumerable: true, get: function () { return service_type_js_1.MethodIdempotency; } }));
var binary_encoding_js_1 = __webpack_require__(29);
Object.defineProperty(exports, "WireType", ({ enumerable: true, get: function () { return binary_encoding_js_1.WireType; } }));
Object.defineProperty(exports, "BinaryWriter", ({ enumerable: true, get: function () { return binary_encoding_js_1.BinaryWriter; } }));
Object.defineProperty(exports, "BinaryReader", ({ enumerable: true, get: function () { return binary_encoding_js_1.BinaryReader; } }));
var create_descriptor_set_js_1 = __webpack_require__(41);
Object.defineProperty(exports, "createDescriptorSet", ({ enumerable: true, get: function () { return create_descriptor_set_js_1.createDescriptorSet; } }));
var create_registry_js_1 = __webpack_require__(45);
Object.defineProperty(exports, "createRegistry", ({ enumerable: true, get: function () { return create_registry_js_1.createRegistry; } }));
Object.defineProperty(exports, "createMutableRegistry", ({ enumerable: true, get: function () { return create_registry_js_1.createMutableRegistry; } }));
var create_registry_from_desc_js_1 = __webpack_require__(46);
Object.defineProperty(exports, "createRegistryFromDescriptors", ({ enumerable: true, get: function () { return create_registry_from_desc_js_1.createRegistryFromDescriptors; } }));
var to_plain_message_js_1 = __webpack_require__(54);
Object.defineProperty(exports, "toPlainMessage", ({ enumerable: true, get: function () { return to_plain_message_js_1.toPlainMessage; } }));
// ideally, we would export these types with sub-path exports:
__exportStar(__webpack_require__(55), exports);
__exportStar(__webpack_require__(56), exports);
__exportStar(__webpack_require__(49), exports);
__exportStar(__webpack_require__(42), exports);
__exportStar(__webpack_require__(48), exports);
__exportStar(__webpack_require__(50), exports);
__exportStar(__webpack_require__(51), exports);
__exportStar(__webpack_require__(58), exports);
__exportStar(__webpack_require__(52), exports);
__exportStar(__webpack_require__(47), exports);
__exportStar(__webpack_require__(57), exports);
__exportStar(__webpack_require__(53), exports);


/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.proto3 = void 0;
const proto_runtime_js_1 = __webpack_require__(12);
const field_list_js_1 = __webpack_require__(31);
const scalars_js_1 = __webpack_require__(18);
const field_normalize_js_1 = __webpack_require__(32);
/**
 * Provides functionality for messages defined with the proto3 syntax.
 */
exports.proto3 = (0, proto_runtime_js_1.makeProtoRuntime)("proto3", (fields) => {
    return new field_list_js_1.InternalFieldList(fields, (source) => (0, field_normalize_js_1.normalizeFieldInfos)(source, true));
},
// TODO merge with proto2 and initExtensionField, also see initPartial, equals, clone
(target) => {
    for (const member of target.getType().fields.byMember()) {
        if (member.opt) {
            continue;
        }
        const name = member.localName, t = target;
        if (member.repeated) {
            t[name] = [];
            continue;
        }
        switch (member.kind) {
            case "oneof":
                t[name] = { case: undefined };
                break;
            case "enum":
                t[name] = 0;
                break;
            case "map":
                t[name] = {};
                break;
            case "scalar":
                t[name] = (0, scalars_js_1.scalarZeroValue)(member.T, member.L);
                break;
            case "message":
                // message fields are always optional in proto3
                break;
        }
    }
});


/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.makeProtoRuntime = void 0;
const enum_js_1 = __webpack_require__(13);
const message_type_js_1 = __webpack_require__(15);
const extensions_js_1 = __webpack_require__(17);
const json_format_js_1 = __webpack_require__(22);
const binary_format_js_1 = __webpack_require__(28);
const util_common_js_1 = __webpack_require__(30);
function makeProtoRuntime(syntax, newFieldList, initFields) {
    return {
        syntax,
        json: (0, json_format_js_1.makeJsonFormat)(),
        bin: (0, binary_format_js_1.makeBinaryFormat)(),
        util: Object.assign(Object.assign({}, (0, util_common_js_1.makeUtilCommon)()), { newFieldList,
            initFields }),
        makeMessageType(typeName, fields, opt) {
            return (0, message_type_js_1.makeMessageType)(this, typeName, fields, opt);
        },
        makeEnum: enum_js_1.makeEnum,
        makeEnumType: enum_js_1.makeEnumType,
        getEnumType: enum_js_1.getEnumType,
        makeExtension(typeName, extendee, field) {
            return (0, extensions_js_1.makeExtension)(this, typeName, extendee, field);
        },
    };
}
exports.makeProtoRuntime = makeProtoRuntime;


/***/ }),
/* 13 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.makeEnum = exports.makeEnumType = exports.setEnumType = exports.getEnumType = void 0;
const assert_js_1 = __webpack_require__(14);
const enumTypeSymbol = Symbol("@bufbuild/protobuf/enum-type");
/**
 * Get reflection information from a generated enum.
 * If this function is called on something other than a generated
 * enum, it raises an error.
 */
function getEnumType(enumObject) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-explicit-any
    const t = enumObject[enumTypeSymbol];
    (0, assert_js_1.assert)(t, "missing enum type on enum object");
    return t; // eslint-disable-line @typescript-eslint/no-unsafe-return
}
exports.getEnumType = getEnumType;
/**
 * Sets reflection information on a generated enum.
 */
function setEnumType(enumObject, typeName, values, opt) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    enumObject[enumTypeSymbol] = makeEnumType(typeName, values.map((v) => ({
        no: v.no,
        name: v.name,
        localName: enumObject[v.no],
    })), opt);
}
exports.setEnumType = setEnumType;
/**
 * Create a new EnumType with the given values.
 */
function makeEnumType(typeName, values,
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_opt) {
    const names = Object.create(null);
    const numbers = Object.create(null);
    const normalValues = [];
    for (const value of values) {
        // We do not surface options at this time
        // const value: EnumValueInfo = {...v, options: v.options ?? emptyReadonlyObject};
        const n = normalizeEnumValue(value);
        normalValues.push(n);
        names[value.name] = n;
        numbers[value.no] = n;
    }
    return {
        typeName,
        values: normalValues,
        // We do not surface options at this time
        // options: opt?.options ?? Object.create(null),
        findName(name) {
            return names[name];
        },
        findNumber(no) {
            return numbers[no];
        },
    };
}
exports.makeEnumType = makeEnumType;
/**
 * Create a new enum object with the given values.
 * Sets reflection information.
 */
function makeEnum(typeName, values, opt) {
    const enumObject = {};
    for (const value of values) {
        const n = normalizeEnumValue(value);
        enumObject[n.localName] = n.no;
        enumObject[n.no] = n.localName;
    }
    setEnumType(enumObject, typeName, values, opt);
    return enumObject;
}
exports.makeEnum = makeEnum;
function normalizeEnumValue(value) {
    if ("localName" in value) {
        return value;
    }
    return Object.assign(Object.assign({}, value), { localName: value.name });
}


/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.assertFloat32 = exports.assertUInt32 = exports.assertInt32 = exports.assert = void 0;
/**
 * Assert that condition is truthy or throw error (with message)
 */
function assert(condition, msg) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- we want the implicit conversion to boolean
    if (!condition) {
        throw new Error(msg);
    }
}
exports.assert = assert;
const FLOAT32_MAX = 3.4028234663852886e38, FLOAT32_MIN = -3.4028234663852886e38, UINT32_MAX = 0xffffffff, INT32_MAX = 0x7fffffff, INT32_MIN = -0x80000000;
/**
 * Assert a valid signed protobuf 32-bit integer.
 */
function assertInt32(arg) {
    if (typeof arg !== "number")
        throw new Error("invalid int 32: " + typeof arg);
    if (!Number.isInteger(arg) || arg > INT32_MAX || arg < INT32_MIN)
        throw new Error("invalid int 32: " + arg); // eslint-disable-line @typescript-eslint/restrict-plus-operands -- we want the implicit conversion to string
}
exports.assertInt32 = assertInt32;
/**
 * Assert a valid unsigned protobuf 32-bit integer.
 */
function assertUInt32(arg) {
    if (typeof arg !== "number")
        throw new Error("invalid uint 32: " + typeof arg);
    if (!Number.isInteger(arg) || arg > UINT32_MAX || arg < 0)
        throw new Error("invalid uint 32: " + arg); // eslint-disable-line @typescript-eslint/restrict-plus-operands -- we want the implicit conversion to string
}
exports.assertUInt32 = assertUInt32;
/**
 * Assert a valid protobuf float value.
 */
function assertFloat32(arg) {
    if (typeof arg !== "number")
        throw new Error("invalid float 32: " + typeof arg);
    if (!Number.isFinite(arg))
        return;
    if (arg > FLOAT32_MAX || arg < FLOAT32_MIN)
        throw new Error("invalid float 32: " + arg); // eslint-disable-line @typescript-eslint/restrict-plus-operands -- we want the implicit conversion to string
}
exports.assertFloat32 = assertFloat32;


/***/ }),
/* 15 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.makeMessageType = void 0;
const message_js_1 = __webpack_require__(16);
/**
 * Create a new message type using the given runtime.
 */
function makeMessageType(runtime, typeName, fields, opt) {
    var _a;
    const localName = (_a = opt === null || opt === void 0 ? void 0 : opt.localName) !== null && _a !== void 0 ? _a : typeName.substring(typeName.lastIndexOf(".") + 1);
    const type = {
        [localName]: function (data) {
            runtime.util.initFields(this);
            runtime.util.initPartial(data, this);
        },
    }[localName];
    Object.setPrototypeOf(type.prototype, new message_js_1.Message());
    Object.assign(type, {
        runtime,
        typeName,
        fields: runtime.util.newFieldList(fields),
        fromBinary(bytes, options) {
            return new type().fromBinary(bytes, options);
        },
        fromJson(jsonValue, options) {
            return new type().fromJson(jsonValue, options);
        },
        fromJsonString(jsonString, options) {
            return new type().fromJsonString(jsonString, options);
        },
        equals(a, b) {
            return runtime.util.equals(type, a, b);
        },
    });
    return type;
}
exports.makeMessageType = makeMessageType;


/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Message = void 0;
/**
 * Message is the base class of every message, generated, or created at
 * runtime.
 *
 * It is _not_ safe to extend this class. If you want to create a message at
 * run time, use proto3.makeMessageType().
 */
class Message {
    /**
     * Compare with a message of the same type.
     * Note that this function disregards extensions and unknown fields.
     */
    equals(other) {
        return this.getType().runtime.util.equals(this.getType(), this, other);
    }
    /**
     * Create a deep copy.
     */
    clone() {
        return this.getType().runtime.util.clone(this);
    }
    /**
     * Parse from binary data, merging fields.
     *
     * Repeated fields are appended. Map entries are added, overwriting
     * existing keys.
     *
     * If a message field is already present, it will be merged with the
     * new data.
     */
    fromBinary(bytes, options) {
        const type = this.getType(), format = type.runtime.bin, opt = format.makeReadOptions(options);
        format.readMessage(this, opt.readerFactory(bytes), bytes.byteLength, opt);
        return this;
    }
    /**
     * Parse a message from a JSON value.
     */
    fromJson(jsonValue, options) {
        const type = this.getType(), format = type.runtime.json, opt = format.makeReadOptions(options);
        format.readMessage(type, jsonValue, opt, this);
        return this;
    }
    /**
     * Parse a message from a JSON string.
     */
    fromJsonString(jsonString, options) {
        let json;
        try {
            json = JSON.parse(jsonString);
        }
        catch (e) {
            throw new Error(`cannot decode ${this.getType().typeName} from JSON: ${e instanceof Error ? e.message : String(e)}`);
        }
        return this.fromJson(json, options);
    }
    /**
     * Serialize the message to binary data.
     */
    toBinary(options) {
        const type = this.getType(), bin = type.runtime.bin, opt = bin.makeWriteOptions(options), writer = opt.writerFactory();
        bin.writeMessage(this, writer, opt);
        return writer.finish();
    }
    /**
     * Serialize the message to a JSON value, a JavaScript value that can be
     * passed to JSON.stringify().
     */
    toJson(options) {
        const type = this.getType(), json = type.runtime.json, opt = json.makeWriteOptions(options);
        return json.writeMessage(this, opt);
    }
    /**
     * Serialize the message to a JSON string.
     */
    toJsonString(options) {
        var _a;
        const value = this.toJson(options);
        return JSON.stringify(value, null, (_a = options === null || options === void 0 ? void 0 : options.prettySpaces) !== null && _a !== void 0 ? _a : 0);
    }
    /**
     * Override for serialization behavior. This will be invoked when calling
     * JSON.stringify on this message (i.e. JSON.stringify(msg)).
     *
     * Note that this will not serialize google.protobuf.Any with a packed
     * message because the protobuf JSON format specifies that it needs to be
     * unpacked, and this is only possible with a type registry to look up the
     * message type.  As a result, attempting to serialize a message with this
     * type will throw an Error.
     *
     * This method is protected because you should not need to invoke it
     * directly -- instead use JSON.stringify or toJsonString for
     * stringified JSON.  Alternatively, if actual JSON is desired, you should
     * use toJson.
     */
    toJSON() {
        return this.toJson({
            emitDefaultValues: true,
        });
    }
    /**
     * Retrieve the MessageType of this message - a singleton that represents
     * the protobuf message declaration and provides metadata for reflection-
     * based operations.
     */
    getType() {
        // Any class that extends Message _must_ provide a complete static
        // implementation of MessageType.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
        return Object.getPrototypeOf(this).constructor;
    }
}
exports.Message = Message;


/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.filterUnknownFields = exports.createExtensionContainer = exports.makeExtension = void 0;
const scalars_js_1 = __webpack_require__(18);
/**
 * Create a new extension using the given runtime.
 */
function makeExtension(runtime, typeName, extendee, field) {
    let fi;
    return {
        typeName,
        extendee,
        get field() {
            if (!fi) {
                const i = (typeof field == "function" ? field() : field);
                i.name = typeName.split(".").pop();
                i.jsonName = `[${typeName}]`;
                fi = runtime.util.newFieldList([i]).list()[0];
            }
            return fi;
        },
        runtime,
    };
}
exports.makeExtension = makeExtension;
/**
 * Create a container that allows us to read extension fields into it with the
 * same logic as regular fields.
 */
function createExtensionContainer(extension) {
    const localName = extension.field.localName;
    const container = Object.create(null);
    container[localName] = initExtensionField(extension);
    return [container, () => container[localName]];
}
exports.createExtensionContainer = createExtensionContainer;
function initExtensionField(ext) {
    const field = ext.field;
    if (field.repeated) {
        return [];
    }
    if (field.default !== undefined) {
        return field.default;
    }
    switch (field.kind) {
        case "enum":
            return field.T.values[0].no;
        case "scalar":
            return (0, scalars_js_1.scalarZeroValue)(field.T, field.L);
        case "message":
            // eslint-disable-next-line no-case-declarations
            const T = field.T, value = new T();
            return T.fieldWrapper ? T.fieldWrapper.unwrapField(value) : value;
        case "map":
            throw "map fields are not allowed to be extensions";
    }
}
/**
 * Helper to filter unknown fields, optimized based on field type.
 */
function filterUnknownFields(unknownFields, field) {
    if (!field.repeated && (field.kind == "enum" || field.kind == "scalar")) {
        // singular scalar fields do not merge, we pick the last
        for (let i = unknownFields.length - 1; i >= 0; --i) {
            if (unknownFields[i].no == field.no) {
                return [unknownFields[i]];
            }
        }
        return [];
    }
    return unknownFields.filter((uf) => uf.no === field.no);
}
exports.filterUnknownFields = filterUnknownFields;


/***/ }),
/* 18 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isScalarZeroValue = exports.scalarZeroValue = exports.scalarEquals = void 0;
const proto_int64_js_1 = __webpack_require__(19);
const scalar_js_1 = __webpack_require__(21);
/**
 * Returns true if both scalar values are equal.
 */
function scalarEquals(type, a, b) {
    if (a === b) {
        // This correctly matches equal values except BYTES and (possibly) 64-bit integers.
        return true;
    }
    // Special case BYTES - we need to compare each byte individually
    if (type == scalar_js_1.ScalarType.BYTES) {
        if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) {
            return false;
        }
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
    // Special case 64-bit integers - we support number, string and bigint representation.
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (type) {
        case scalar_js_1.ScalarType.UINT64:
        case scalar_js_1.ScalarType.FIXED64:
        case scalar_js_1.ScalarType.INT64:
        case scalar_js_1.ScalarType.SFIXED64:
        case scalar_js_1.ScalarType.SINT64:
            // Loose comparison will match between 0n, 0 and "0".
            return a == b;
    }
    // Anything that hasn't been caught by strict comparison or special cased
    // BYTES and 64-bit integers is not equal.
    return false;
}
exports.scalarEquals = scalarEquals;
/**
 * Returns the zero value for the given scalar type.
 */
function scalarZeroValue(type, longType) {
    switch (type) {
        case scalar_js_1.ScalarType.BOOL:
            return false;
        case scalar_js_1.ScalarType.UINT64:
        case scalar_js_1.ScalarType.FIXED64:
        case scalar_js_1.ScalarType.INT64:
        case scalar_js_1.ScalarType.SFIXED64:
        case scalar_js_1.ScalarType.SINT64:
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- acceptable since it's covered by tests
            return (longType == 0 ? proto_int64_js_1.protoInt64.zero : "0");
        case scalar_js_1.ScalarType.DOUBLE:
        case scalar_js_1.ScalarType.FLOAT:
            return 0.0;
        case scalar_js_1.ScalarType.BYTES:
            return new Uint8Array(0);
        case scalar_js_1.ScalarType.STRING:
            return "";
        default:
            // Handles INT32, UINT32, SINT32, FIXED32, SFIXED32.
            // We do not use individual cases to save a few bytes code size.
            return 0;
    }
}
exports.scalarZeroValue = scalarZeroValue;
/**
 * Returns true for a zero-value. For example, an integer has the zero-value `0`,
 * a boolean is `false`, a string is `""`, and bytes is an empty Uint8Array.
 *
 * In proto3, zero-values are not written to the wire, unless the field is
 * optional or repeated.
 */
function isScalarZeroValue(type, value) {
    switch (type) {
        case scalar_js_1.ScalarType.BOOL:
            return value === false;
        case scalar_js_1.ScalarType.STRING:
            return value === "";
        case scalar_js_1.ScalarType.BYTES:
            return value instanceof Uint8Array && !value.byteLength;
        default:
            return value == 0; // Loose comparison matches 0n, 0 and "0"
    }
}
exports.isScalarZeroValue = isScalarZeroValue;


/***/ }),
/* 19 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.protoInt64 = void 0;
const assert_js_1 = __webpack_require__(14);
const varint_js_1 = __webpack_require__(20);
function makeInt64Support() {
    const dv = new DataView(new ArrayBuffer(8));
    // note that Safari 14 implements BigInt, but not the DataView methods
    const ok = typeof BigInt === "function" &&
        typeof dv.getBigInt64 === "function" &&
        typeof dv.getBigUint64 === "function" &&
        typeof dv.setBigInt64 === "function" &&
        typeof dv.setBigUint64 === "function" &&
        (typeof process != "object" ||
            typeof {} != "object" ||
            {}.BUF_BIGINT_DISABLE !== "1");
    if (ok) {
        const MIN = BigInt("-9223372036854775808"), MAX = BigInt("9223372036854775807"), UMIN = BigInt("0"), UMAX = BigInt("18446744073709551615");
        return {
            zero: BigInt(0),
            supported: true,
            parse(value) {
                const bi = typeof value == "bigint" ? value : BigInt(value);
                if (bi > MAX || bi < MIN) {
                    throw new Error(`int64 invalid: ${value}`);
                }
                return bi;
            },
            uParse(value) {
                const bi = typeof value == "bigint" ? value : BigInt(value);
                if (bi > UMAX || bi < UMIN) {
                    throw new Error(`uint64 invalid: ${value}`);
                }
                return bi;
            },
            enc(value) {
                dv.setBigInt64(0, this.parse(value), true);
                return {
                    lo: dv.getInt32(0, true),
                    hi: dv.getInt32(4, true),
                };
            },
            uEnc(value) {
                dv.setBigInt64(0, this.uParse(value), true);
                return {
                    lo: dv.getInt32(0, true),
                    hi: dv.getInt32(4, true),
                };
            },
            dec(lo, hi) {
                dv.setInt32(0, lo, true);
                dv.setInt32(4, hi, true);
                return dv.getBigInt64(0, true);
            },
            uDec(lo, hi) {
                dv.setInt32(0, lo, true);
                dv.setInt32(4, hi, true);
                return dv.getBigUint64(0, true);
            },
        };
    }
    const assertInt64String = (value) => (0, assert_js_1.assert)(/^-?[0-9]+$/.test(value), `int64 invalid: ${value}`);
    const assertUInt64String = (value) => (0, assert_js_1.assert)(/^[0-9]+$/.test(value), `uint64 invalid: ${value}`);
    return {
        zero: "0",
        supported: false,
        parse(value) {
            if (typeof value != "string") {
                value = value.toString();
            }
            assertInt64String(value);
            return value;
        },
        uParse(value) {
            if (typeof value != "string") {
                value = value.toString();
            }
            assertUInt64String(value);
            return value;
        },
        enc(value) {
            if (typeof value != "string") {
                value = value.toString();
            }
            assertInt64String(value);
            return (0, varint_js_1.int64FromString)(value);
        },
        uEnc(value) {
            if (typeof value != "string") {
                value = value.toString();
            }
            assertUInt64String(value);
            return (0, varint_js_1.int64FromString)(value);
        },
        dec(lo, hi) {
            return (0, varint_js_1.int64ToString)(lo, hi);
        },
        uDec(lo, hi) {
            return (0, varint_js_1.uInt64ToString)(lo, hi);
        },
    };
}
exports.protoInt64 = makeInt64Support();


/***/ }),
/* 20 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2008 Google Inc.  All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
// * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Code generated by the Protocol Buffer compiler is owned by the owner
// of the input file used when generating it.  This code is not
// standalone and requires a support library to be linked with it.  This
// support library is itself covered by the above license.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.varint32read = exports.varint32write = exports.uInt64ToString = exports.int64ToString = exports.int64FromString = exports.varint64write = exports.varint64read = void 0;
/* eslint-disable prefer-const,@typescript-eslint/restrict-plus-operands */
/**
 * Read a 64 bit varint as two JS numbers.
 *
 * Returns tuple:
 * [0]: low bits
 * [1]: high bits
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/buffer_decoder.js#L175
 */
function varint64read() {
    let lowBits = 0;
    let highBits = 0;
    for (let shift = 0; shift < 28; shift += 7) {
        let b = this.buf[this.pos++];
        lowBits |= (b & 0x7f) << shift;
        if ((b & 0x80) == 0) {
            this.assertBounds();
            return [lowBits, highBits];
        }
    }
    let middleByte = this.buf[this.pos++];
    // last four bits of the first 32 bit number
    lowBits |= (middleByte & 0x0f) << 28;
    // 3 upper bits are part of the next 32 bit number
    highBits = (middleByte & 0x70) >> 4;
    if ((middleByte & 0x80) == 0) {
        this.assertBounds();
        return [lowBits, highBits];
    }
    for (let shift = 3; shift <= 31; shift += 7) {
        let b = this.buf[this.pos++];
        highBits |= (b & 0x7f) << shift;
        if ((b & 0x80) == 0) {
            this.assertBounds();
            return [lowBits, highBits];
        }
    }
    throw new Error("invalid varint");
}
exports.varint64read = varint64read;
/**
 * Write a 64 bit varint, given as two JS numbers, to the given bytes array.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/writer.js#L344
 */
function varint64write(lo, hi, bytes) {
    for (let i = 0; i < 28; i = i + 7) {
        const shift = lo >>> i;
        const hasNext = !(shift >>> 7 == 0 && hi == 0);
        const byte = (hasNext ? shift | 0x80 : shift) & 0xff;
        bytes.push(byte);
        if (!hasNext) {
            return;
        }
    }
    const splitBits = ((lo >>> 28) & 0x0f) | ((hi & 0x07) << 4);
    const hasMoreBits = !(hi >> 3 == 0);
    bytes.push((hasMoreBits ? splitBits | 0x80 : splitBits) & 0xff);
    if (!hasMoreBits) {
        return;
    }
    for (let i = 3; i < 31; i = i + 7) {
        const shift = hi >>> i;
        const hasNext = !(shift >>> 7 == 0);
        const byte = (hasNext ? shift | 0x80 : shift) & 0xff;
        bytes.push(byte);
        if (!hasNext) {
            return;
        }
    }
    bytes.push((hi >>> 31) & 0x01);
}
exports.varint64write = varint64write;
// constants for binary math
const TWO_PWR_32_DBL = 0x100000000;
/**
 * Parse decimal string of 64 bit integer value as two JS numbers.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
 */
function int64FromString(dec) {
    // Check for minus sign.
    const minus = dec[0] === "-";
    if (minus) {
        dec = dec.slice(1);
    }
    // Work 6 decimal digits at a time, acting like we're converting base 1e6
    // digits to binary. This is safe to do with floating point math because
    // Number.isSafeInteger(ALL_32_BITS * 1e6) == true.
    const base = 1e6;
    let lowBits = 0;
    let highBits = 0;
    function add1e6digit(begin, end) {
        // Note: Number('') is 0.
        const digit1e6 = Number(dec.slice(begin, end));
        highBits *= base;
        lowBits = lowBits * base + digit1e6;
        // Carry bits from lowBits to
        if (lowBits >= TWO_PWR_32_DBL) {
            highBits = highBits + ((lowBits / TWO_PWR_32_DBL) | 0);
            lowBits = lowBits % TWO_PWR_32_DBL;
        }
    }
    add1e6digit(-24, -18);
    add1e6digit(-18, -12);
    add1e6digit(-12, -6);
    add1e6digit(-6);
    return minus ? negate(lowBits, highBits) : newBits(lowBits, highBits);
}
exports.int64FromString = int64FromString;
/**
 * Losslessly converts a 64-bit signed integer in 32:32 split representation
 * into a decimal string.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
 */
function int64ToString(lo, hi) {
    let bits = newBits(lo, hi);
    // If we're treating the input as a signed value and the high bit is set, do
    // a manual two's complement conversion before the decimal conversion.
    const negative = (bits.hi & 0x80000000);
    if (negative) {
        bits = negate(bits.lo, bits.hi);
    }
    const result = uInt64ToString(bits.lo, bits.hi);
    return negative ? "-" + result : result;
}
exports.int64ToString = int64ToString;
/**
 * Losslessly converts a 64-bit unsigned integer in 32:32 split representation
 * into a decimal string.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
 */
function uInt64ToString(lo, hi) {
    ({ lo, hi } = toUnsigned(lo, hi));
    // Skip the expensive conversion if the number is small enough to use the
    // built-in conversions.
    // Number.MAX_SAFE_INTEGER = 0x001FFFFF FFFFFFFF, thus any number with
    // highBits <= 0x1FFFFF can be safely expressed with a double and retain
    // integer precision.
    // Proven by: Number.isSafeInteger(0x1FFFFF * 2**32 + 0xFFFFFFFF) == true.
    if (hi <= 0x1FFFFF) {
        return String(TWO_PWR_32_DBL * hi + lo);
    }
    // What this code is doing is essentially converting the input number from
    // base-2 to base-1e7, which allows us to represent the 64-bit range with
    // only 3 (very large) digits. Those digits are then trivial to convert to
    // a base-10 string.
    // The magic numbers used here are -
    // 2^24 = 16777216 = (1,6777216) in base-1e7.
    // 2^48 = 281474976710656 = (2,8147497,6710656) in base-1e7.
    // Split 32:32 representation into 16:24:24 representation so our
    // intermediate digits don't overflow.
    const low = lo & 0xFFFFFF;
    const mid = ((lo >>> 24) | (hi << 8)) & 0xFFFFFF;
    const high = (hi >> 16) & 0xFFFF;
    // Assemble our three base-1e7 digits, ignoring carries. The maximum
    // value in a digit at this step is representable as a 48-bit integer, which
    // can be stored in a 64-bit floating point number.
    let digitA = low + (mid * 6777216) + (high * 6710656);
    let digitB = mid + (high * 8147497);
    let digitC = (high * 2);
    // Apply carries from A to B and from B to C.
    const base = 10000000;
    if (digitA >= base) {
        digitB += Math.floor(digitA / base);
        digitA %= base;
    }
    if (digitB >= base) {
        digitC += Math.floor(digitB / base);
        digitB %= base;
    }
    // If digitC is 0, then we should have returned in the trivial code path
    // at the top for non-safe integers. Given this, we can assume both digitB
    // and digitA need leading zeros.
    return digitC.toString() + decimalFrom1e7WithLeadingZeros(digitB) +
        decimalFrom1e7WithLeadingZeros(digitA);
}
exports.uInt64ToString = uInt64ToString;
function toUnsigned(lo, hi) {
    return { lo: lo >>> 0, hi: hi >>> 0 };
}
function newBits(lo, hi) {
    return { lo: lo | 0, hi: hi | 0 };
}
/**
 * Returns two's compliment negation of input.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Signed_32-bit_integers
 */
function negate(lowBits, highBits) {
    highBits = ~highBits;
    if (lowBits) {
        lowBits = ~lowBits + 1;
    }
    else {
        // If lowBits is 0, then bitwise-not is 0xFFFFFFFF,
        // adding 1 to that, results in 0x100000000, which leaves
        // the low bits 0x0 and simply adds one to the high bits.
        highBits += 1;
    }
    return newBits(lowBits, highBits);
}
/**
 * Returns decimal representation of digit1e7 with leading zeros.
 */
const decimalFrom1e7WithLeadingZeros = (digit1e7) => {
    const partial = String(digit1e7);
    return "0000000".slice(partial.length) + partial;
};
/**
 * Write a 32 bit varint, signed or unsigned. Same as `varint64write(0, value, bytes)`
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf/blob/1b18833f4f2a2f681f4e4a25cdf3b0a43115ec26/js/binary/encoder.js#L144
 */
function varint32write(value, bytes) {
    if (value >= 0) {
        // write value as varint 32
        while (value > 0x7f) {
            bytes.push((value & 0x7f) | 0x80);
            value = value >>> 7;
        }
        bytes.push(value);
    }
    else {
        for (let i = 0; i < 9; i++) {
            bytes.push((value & 127) | 128);
            value = value >> 7;
        }
        bytes.push(1);
    }
}
exports.varint32write = varint32write;
/**
 * Read an unsigned 32 bit varint.
 *
 * See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/buffer_decoder.js#L220
 */
function varint32read() {
    let b = this.buf[this.pos++];
    let result = b & 0x7f;
    if ((b & 0x80) == 0) {
        this.assertBounds();
        return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 0x7f) << 7;
    if ((b & 0x80) == 0) {
        this.assertBounds();
        return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 0x7f) << 14;
    if ((b & 0x80) == 0) {
        this.assertBounds();
        return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 0x7f) << 21;
    if ((b & 0x80) == 0) {
        this.assertBounds();
        return result;
    }
    // Extract only last 4 bits
    b = this.buf[this.pos++];
    result |= (b & 0x0f) << 28;
    for (let readBytes = 5; (b & 0x80) !== 0 && readBytes < 10; readBytes++)
        b = this.buf[this.pos++];
    if ((b & 0x80) != 0)
        throw new Error("invalid varint");
    this.assertBounds();
    // Result can have 32 bits, convert it to unsigned
    return result >>> 0;
}
exports.varint32read = varint32read;


/***/ }),
/* 21 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LongType = exports.ScalarType = void 0;
/**
 * Scalar value types. This is a subset of field types declared by protobuf
 * enum google.protobuf.FieldDescriptorProto.Type The types GROUP and MESSAGE
 * are omitted, but the numerical values are identical.
 */
var ScalarType;
(function (ScalarType) {
    // 0 is reserved for errors.
    // Order is weird for historical reasons.
    ScalarType[ScalarType["DOUBLE"] = 1] = "DOUBLE";
    ScalarType[ScalarType["FLOAT"] = 2] = "FLOAT";
    // Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT64 if
    // negative values are likely.
    ScalarType[ScalarType["INT64"] = 3] = "INT64";
    ScalarType[ScalarType["UINT64"] = 4] = "UINT64";
    // Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT32 if
    // negative values are likely.
    ScalarType[ScalarType["INT32"] = 5] = "INT32";
    ScalarType[ScalarType["FIXED64"] = 6] = "FIXED64";
    ScalarType[ScalarType["FIXED32"] = 7] = "FIXED32";
    ScalarType[ScalarType["BOOL"] = 8] = "BOOL";
    ScalarType[ScalarType["STRING"] = 9] = "STRING";
    // Tag-delimited aggregate.
    // Group type is deprecated and not supported in proto3. However, Proto3
    // implementations should still be able to parse the group wire format and
    // treat group fields as unknown fields.
    // TYPE_GROUP = 10,
    // TYPE_MESSAGE = 11,  // Length-delimited aggregate.
    // New in version 2.
    ScalarType[ScalarType["BYTES"] = 12] = "BYTES";
    ScalarType[ScalarType["UINT32"] = 13] = "UINT32";
    // TYPE_ENUM = 14,
    ScalarType[ScalarType["SFIXED32"] = 15] = "SFIXED32";
    ScalarType[ScalarType["SFIXED64"] = 16] = "SFIXED64";
    ScalarType[ScalarType["SINT32"] = 17] = "SINT32";
    ScalarType[ScalarType["SINT64"] = 18] = "SINT64";
})(ScalarType || (exports.ScalarType = ScalarType = {}));
/**
 * JavaScript representation of fields with 64 bit integral types (int64, uint64,
 * sint64, fixed64, sfixed64).
 *
 * This is a subset of google.protobuf.FieldOptions.JSType, which defines JS_NORMAL,
 * JS_STRING, and JS_NUMBER. Protobuf-ES uses BigInt by default, but will use
 * String if `[jstype = JS_STRING]` is specified.
 *
 * ```protobuf
 * uint64 field_a = 1; // BigInt
 * uint64 field_b = 2 [jstype = JS_NORMAL]; // BigInt
 * uint64 field_b = 2 [jstype = JS_NUMBER]; // BigInt
 * uint64 field_b = 2 [jstype = JS_STRING]; // String
 * ```
 */
var LongType;
(function (LongType) {
    /**
     * Use JavaScript BigInt.
     */
    LongType[LongType["BIGINT"] = 0] = "BIGINT";
    /**
     * Use JavaScript String.
     *
     * Field option `[jstype = JS_STRING]`.
     */
    LongType[LongType["STRING"] = 1] = "STRING";
})(LongType || (exports.LongType = LongType = {}));


/***/ }),
/* 22 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.makeJsonFormat = void 0;
const assert_js_1 = __webpack_require__(14);
const proto_int64_js_1 = __webpack_require__(19);
const proto_base64_js_1 = __webpack_require__(23);
const extensions_js_1 = __webpack_require__(17);
const extension_accessor_js_1 = __webpack_require__(24);
const reflect_js_1 = __webpack_require__(25);
const field_wrapper_js_1 = __webpack_require__(26);
const scalars_js_1 = __webpack_require__(18);
const scalars_js_2 = __webpack_require__(18);
const scalar_js_1 = __webpack_require__(21);
const is_message_js_1 = __webpack_require__(27);
/* eslint-disable no-case-declarations,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call */
// Default options for parsing JSON.
const jsonReadDefaults = {
    ignoreUnknownFields: false,
};
// Default options for serializing to JSON.
const jsonWriteDefaults = {
    emitDefaultValues: false,
    enumAsInteger: false,
    useProtoFieldName: false,
    prettySpaces: 0,
};
function makeReadOptions(options) {
    return options ? Object.assign(Object.assign({}, jsonReadDefaults), options) : jsonReadDefaults;
}
function makeWriteOptions(options) {
    return options ? Object.assign(Object.assign({}, jsonWriteDefaults), options) : jsonWriteDefaults;
}
const tokenNull = Symbol();
const tokenIgnoredUnknownEnum = Symbol();
function makeJsonFormat() {
    return {
        makeReadOptions,
        makeWriteOptions,
        readMessage(type, json, options, message) {
            if (json == null || Array.isArray(json) || typeof json != "object") {
                throw new Error(`cannot decode message ${type.typeName} from JSON: ${debugJsonValue(json)}`);
            }
            message = message !== null && message !== void 0 ? message : new type();
            const oneofSeen = new Map();
            const registry = options.typeRegistry;
            for (const [jsonKey, jsonValue] of Object.entries(json)) {
                const field = type.fields.findJsonName(jsonKey);
                if (field) {
                    if (field.oneof) {
                        if (jsonValue === null && field.kind == "scalar") {
                            // see conformance test Required.Proto3.JsonInput.OneofFieldNull{First,Second}
                            continue;
                        }
                        const seen = oneofSeen.get(field.oneof);
                        if (seen !== undefined) {
                            throw new Error(`cannot decode message ${type.typeName} from JSON: multiple keys for oneof "${field.oneof.name}" present: "${seen}", "${jsonKey}"`);
                        }
                        oneofSeen.set(field.oneof, jsonKey);
                    }
                    readField(message, jsonValue, field, options, type);
                }
                else {
                    let found = false;
                    if ((registry === null || registry === void 0 ? void 0 : registry.findExtension) &&
                        jsonKey.startsWith("[") &&
                        jsonKey.endsWith("]")) {
                        const ext = registry.findExtension(jsonKey.substring(1, jsonKey.length - 1));
                        if (ext && ext.extendee.typeName == type.typeName) {
                            found = true;
                            const [container, get] = (0, extensions_js_1.createExtensionContainer)(ext);
                            readField(container, jsonValue, ext.field, options, ext);
                            // We pass on the options as BinaryReadOptions/BinaryWriteOptions,
                            // so that users can bring their own binary reader and writer factories
                            // if necessary.
                            (0, extension_accessor_js_1.setExtension)(message, ext, get(), options);
                        }
                    }
                    if (!found && !options.ignoreUnknownFields) {
                        throw new Error(`cannot decode message ${type.typeName} from JSON: key "${jsonKey}" is unknown`);
                    }
                }
            }
            return message;
        },
        writeMessage(message, options) {
            const type = message.getType();
            const json = {};
            let field;
            try {
                for (field of type.fields.byNumber()) {
                    if (!(0, reflect_js_1.isFieldSet)(field, message)) {
                        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                        if (field.req) {
                            throw `required field not set`;
                        }
                        if (!options.emitDefaultValues) {
                            continue;
                        }
                        if (!canEmitFieldDefaultValue(field)) {
                            continue;
                        }
                    }
                    const value = field.oneof
                        ? message[field.oneof.localName].value
                        : message[field.localName];
                    const jsonValue = writeField(field, value, options);
                    if (jsonValue !== undefined) {
                        json[options.useProtoFieldName ? field.name : field.jsonName] =
                            jsonValue;
                    }
                }
                const registry = options.typeRegistry;
                if (registry === null || registry === void 0 ? void 0 : registry.findExtensionFor) {
                    for (const uf of type.runtime.bin.listUnknownFields(message)) {
                        const ext = registry.findExtensionFor(type.typeName, uf.no);
                        if (ext && (0, extension_accessor_js_1.hasExtension)(message, ext)) {
                            // We pass on the options as BinaryReadOptions, so that users can bring their own
                            // binary reader factory if necessary.
                            const value = (0, extension_accessor_js_1.getExtension)(message, ext, options);
                            const jsonValue = writeField(ext.field, value, options);
                            if (jsonValue !== undefined) {
                                json[ext.field.jsonName] = jsonValue;
                            }
                        }
                    }
                }
            }
            catch (e) {
                const m = field
                    ? `cannot encode field ${type.typeName}.${field.name} to JSON`
                    : `cannot encode message ${type.typeName} to JSON`;
                const r = e instanceof Error ? e.message : String(e);
                throw new Error(m + (r.length > 0 ? `: ${r}` : ""));
            }
            return json;
        },
        readScalar(type, json, longType) {
            // The signature of our internal function has changed. For backwards-
            // compatibility, we support the old form that is part of the public API
            // through the interface JsonFormat.
            return readScalar(type, json, longType !== null && longType !== void 0 ? longType : scalar_js_1.LongType.BIGINT, true);
        },
        writeScalar(type, value, emitDefaultValues) {
            // The signature of our internal function has changed. For backwards-
            // compatibility, we support the old form that is part of the public API
            // through the interface JsonFormat.
            if (value === undefined) {
                return undefined;
            }
            if (emitDefaultValues || (0, scalars_js_2.isScalarZeroValue)(type, value)) {
                return writeScalar(type, value);
            }
            return undefined;
        },
        debug: debugJsonValue,
    };
}
exports.makeJsonFormat = makeJsonFormat;
function debugJsonValue(json) {
    if (json === null) {
        return "null";
    }
    switch (typeof json) {
        case "object":
            return Array.isArray(json) ? "array" : "object";
        case "string":
            return json.length > 100 ? "string" : `"${json.split('"').join('\\"')}"`;
        default:
            return String(json);
    }
}
// Read a JSON value for a field.
// The "parentType" argument is only used to provide context in errors.
function readField(target, jsonValue, field, options, parentType) {
    let localName = field.localName;
    if (field.repeated) {
        (0, assert_js_1.assert)(field.kind != "map");
        if (jsonValue === null) {
            return;
        }
        if (!Array.isArray(jsonValue)) {
            throw new Error(`cannot decode field ${parentType.typeName}.${field.name} from JSON: ${debugJsonValue(jsonValue)}`);
        }
        const targetArray = target[localName];
        for (const jsonItem of jsonValue) {
            if (jsonItem === null) {
                throw new Error(`cannot decode field ${parentType.typeName}.${field.name} from JSON: ${debugJsonValue(jsonItem)}`);
            }
            switch (field.kind) {
                case "message":
                    targetArray.push(field.T.fromJson(jsonItem, options));
                    break;
                case "enum":
                    const enumValue = readEnum(field.T, jsonItem, options.ignoreUnknownFields, true);
                    if (enumValue !== tokenIgnoredUnknownEnum) {
                        targetArray.push(enumValue);
                    }
                    break;
                case "scalar":
                    try {
                        targetArray.push(readScalar(field.T, jsonItem, field.L, true));
                    }
                    catch (e) {
                        let m = `cannot decode field ${parentType.typeName}.${field.name} from JSON: ${debugJsonValue(jsonItem)}`;
                        if (e instanceof Error && e.message.length > 0) {
                            m += `: ${e.message}`;
                        }
                        throw new Error(m);
                    }
                    break;
            }
        }
    }
    else if (field.kind == "map") {
        if (jsonValue === null) {
            return;
        }
        if (typeof jsonValue != "object" || Array.isArray(jsonValue)) {
            throw new Error(`cannot decode field ${parentType.typeName}.${field.name} from JSON: ${debugJsonValue(jsonValue)}`);
        }
        const targetMap = target[localName];
        for (const [jsonMapKey, jsonMapValue] of Object.entries(jsonValue)) {
            if (jsonMapValue === null) {
                throw new Error(`cannot decode field ${parentType.typeName}.${field.name} from JSON: map value null`);
            }
            let key;
            try {
                key = readMapKey(field.K, jsonMapKey);
            }
            catch (e) {
                let m = `cannot decode map key for field ${parentType.typeName}.${field.name} from JSON: ${debugJsonValue(jsonValue)}`;
                if (e instanceof Error && e.message.length > 0) {
                    m += `: ${e.message}`;
                }
                throw new Error(m);
            }
            switch (field.V.kind) {
                case "message":
                    targetMap[key] = field.V.T.fromJson(jsonMapValue, options);
                    break;
                case "enum":
                    const enumValue = readEnum(field.V.T, jsonMapValue, options.ignoreUnknownFields, true);
                    if (enumValue !== tokenIgnoredUnknownEnum) {
                        targetMap[key] = enumValue;
                    }
                    break;
                case "scalar":
                    try {
                        targetMap[key] = readScalar(field.V.T, jsonMapValue, scalar_js_1.LongType.BIGINT, true);
                    }
                    catch (e) {
                        let m = `cannot decode map value for field ${parentType.typeName}.${field.name} from JSON: ${debugJsonValue(jsonValue)}`;
                        if (e instanceof Error && e.message.length > 0) {
                            m += `: ${e.message}`;
                        }
                        throw new Error(m);
                    }
                    break;
            }
        }
    }
    else {
        if (field.oneof) {
            target = target[field.oneof.localName] = { case: localName };
            localName = "value";
        }
        switch (field.kind) {
            case "message":
                const messageType = field.T;
                if (jsonValue === null &&
                    messageType.typeName != "google.protobuf.Value") {
                    return;
                }
                let currentValue = target[localName];
                if ((0, is_message_js_1.isMessage)(currentValue)) {
                    currentValue.fromJson(jsonValue, options);
                }
                else {
                    target[localName] = currentValue = messageType.fromJson(jsonValue, options);
                    if (messageType.fieldWrapper && !field.oneof) {
                        target[localName] =
                            messageType.fieldWrapper.unwrapField(currentValue);
                    }
                }
                break;
            case "enum":
                const enumValue = readEnum(field.T, jsonValue, options.ignoreUnknownFields, false);
                switch (enumValue) {
                    case tokenNull:
                        (0, reflect_js_1.clearField)(field, target);
                        break;
                    case tokenIgnoredUnknownEnum:
                        break;
                    default:
                        target[localName] = enumValue;
                        break;
                }
                break;
            case "scalar":
                try {
                    const scalarValue = readScalar(field.T, jsonValue, field.L, false);
                    switch (scalarValue) {
                        case tokenNull:
                            (0, reflect_js_1.clearField)(field, target);
                            break;
                        default:
                            target[localName] = scalarValue;
                            break;
                    }
                }
                catch (e) {
                    let m = `cannot decode field ${parentType.typeName}.${field.name} from JSON: ${debugJsonValue(jsonValue)}`;
                    if (e instanceof Error && e.message.length > 0) {
                        m += `: ${e.message}`;
                    }
                    throw new Error(m);
                }
                break;
        }
    }
}
function readMapKey(type, json) {
    if (type === scalar_js_1.ScalarType.BOOL) {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (json) {
            case "true":
                json = true;
                break;
            case "false":
                json = false;
                break;
        }
    }
    return readScalar(type, json, scalar_js_1.LongType.BIGINT, true).toString();
}
function readScalar(type, json, longType, nullAsZeroValue) {
    if (json === null) {
        if (nullAsZeroValue) {
            return (0, scalars_js_1.scalarZeroValue)(type, longType);
        }
        return tokenNull;
    }
    // every valid case in the switch below returns, and every fall
    // through is regarded as a failure.
    switch (type) {
        // float, double: JSON value will be a number or one of the special string values "NaN", "Infinity", and "-Infinity".
        // Either numbers or strings are accepted. Exponent notation is also accepted.
        case scalar_js_1.ScalarType.DOUBLE:
        case scalar_js_1.ScalarType.FLOAT:
            if (json === "NaN")
                return Number.NaN;
            if (json === "Infinity")
                return Number.POSITIVE_INFINITY;
            if (json === "-Infinity")
                return Number.NEGATIVE_INFINITY;
            if (json === "") {
                // empty string is not a number
                break;
            }
            if (typeof json == "string" && json.trim().length !== json.length) {
                // extra whitespace
                break;
            }
            if (typeof json != "string" && typeof json != "number") {
                break;
            }
            const float = Number(json);
            if (Number.isNaN(float)) {
                // not a number
                break;
            }
            if (!Number.isFinite(float)) {
                // infinity and -infinity are handled by string representation above, so this is an error
                break;
            }
            if (type == scalar_js_1.ScalarType.FLOAT)
                (0, assert_js_1.assertFloat32)(float);
            return float;
        // int32, fixed32, uint32: JSON value will be a decimal number. Either numbers or strings are accepted.
        case scalar_js_1.ScalarType.INT32:
        case scalar_js_1.ScalarType.FIXED32:
        case scalar_js_1.ScalarType.SFIXED32:
        case scalar_js_1.ScalarType.SINT32:
        case scalar_js_1.ScalarType.UINT32:
            let int32;
            if (typeof json == "number")
                int32 = json;
            else if (typeof json == "string" && json.length > 0) {
                if (json.trim().length === json.length)
                    int32 = Number(json);
            }
            if (int32 === undefined)
                break;
            if (type == scalar_js_1.ScalarType.UINT32 || type == scalar_js_1.ScalarType.FIXED32)
                (0, assert_js_1.assertUInt32)(int32);
            else
                (0, assert_js_1.assertInt32)(int32);
            return int32;
        // int64, fixed64, uint64: JSON value will be a decimal string. Either numbers or strings are accepted.
        case scalar_js_1.ScalarType.INT64:
        case scalar_js_1.ScalarType.SFIXED64:
        case scalar_js_1.ScalarType.SINT64:
            if (typeof json != "number" && typeof json != "string")
                break;
            const long = proto_int64_js_1.protoInt64.parse(json);
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            return longType ? long.toString() : long;
        case scalar_js_1.ScalarType.FIXED64:
        case scalar_js_1.ScalarType.UINT64:
            if (typeof json != "number" && typeof json != "string")
                break;
            const uLong = proto_int64_js_1.protoInt64.uParse(json);
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            return longType ? uLong.toString() : uLong;
        // bool:
        case scalar_js_1.ScalarType.BOOL:
            if (typeof json !== "boolean")
                break;
            return json;
        // string:
        case scalar_js_1.ScalarType.STRING:
            if (typeof json !== "string") {
                break;
            }
            // A string must always contain UTF-8 encoded or 7-bit ASCII.
            // We validate with encodeURIComponent, which appears to be the fastest widely available option.
            try {
                encodeURIComponent(json);
            }
            catch (e) {
                throw new Error("invalid UTF8");
            }
            return json;
        // bytes: JSON value will be the data encoded as a string using standard base64 encoding with paddings.
        // Either standard or URL-safe base64 encoding with/without paddings are accepted.
        case scalar_js_1.ScalarType.BYTES:
            if (json === "")
                return new Uint8Array(0);
            if (typeof json !== "string")
                break;
            return proto_base64_js_1.protoBase64.dec(json);
    }
    throw new Error();
}
function readEnum(type, json, ignoreUnknownFields, nullAsZeroValue) {
    if (json === null) {
        if (type.typeName == "google.protobuf.NullValue") {
            return 0; // google.protobuf.NullValue.NULL_VALUE = 0
        }
        return nullAsZeroValue ? type.values[0].no : tokenNull;
    }
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (typeof json) {
        case "number":
            if (Number.isInteger(json)) {
                return json;
            }
            break;
        case "string":
            const value = type.findName(json);
            if (value !== undefined) {
                return value.no;
            }
            if (ignoreUnknownFields) {
                return tokenIgnoredUnknownEnum;
            }
            break;
    }
    throw new Error(`cannot decode enum ${type.typeName} from JSON: ${debugJsonValue(json)}`);
}
// Decide whether an unset field should be emitted with JSON write option `emitDefaultValues`
function canEmitFieldDefaultValue(field) {
    if (field.repeated || field.kind == "map") {
        // maps are {}, repeated fields are []
        return true;
    }
    if (field.oneof) {
        // oneof fields are never emitted
        return false;
    }
    if (field.kind == "message") {
        // singular message field are allowed to emit JSON null, but we do not
        return false;
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (field.opt || field.req) {
        // the field uses explicit presence, so we cannot emit a zero value
        return false;
    }
    return true;
}
function writeField(field, value, options) {
    if (field.kind == "map") {
        (0, assert_js_1.assert)(typeof value == "object" && value != null);
        const jsonObj = {};
        const entries = Object.entries(value);
        switch (field.V.kind) {
            case "scalar":
                for (const [entryKey, entryValue] of entries) {
                    jsonObj[entryKey.toString()] = writeScalar(field.V.T, entryValue); // JSON standard allows only (double quoted) string as property key
                }
                break;
            case "message":
                for (const [entryKey, entryValue] of entries) {
                    // JSON standard allows only (double quoted) string as property key
                    jsonObj[entryKey.toString()] = entryValue.toJson(options);
                }
                break;
            case "enum":
                const enumType = field.V.T;
                for (const [entryKey, entryValue] of entries) {
                    // JSON standard allows only (double quoted) string as property key
                    jsonObj[entryKey.toString()] = writeEnum(enumType, entryValue, options.enumAsInteger);
                }
                break;
        }
        return options.emitDefaultValues || entries.length > 0
            ? jsonObj
            : undefined;
    }
    if (field.repeated) {
        (0, assert_js_1.assert)(Array.isArray(value));
        const jsonArr = [];
        switch (field.kind) {
            case "scalar":
                for (let i = 0; i < value.length; i++) {
                    jsonArr.push(writeScalar(field.T, value[i]));
                }
                break;
            case "enum":
                for (let i = 0; i < value.length; i++) {
                    jsonArr.push(writeEnum(field.T, value[i], options.enumAsInteger));
                }
                break;
            case "message":
                for (let i = 0; i < value.length; i++) {
                    jsonArr.push(value[i].toJson(options));
                }
                break;
        }
        return options.emitDefaultValues || jsonArr.length > 0
            ? jsonArr
            : undefined;
    }
    switch (field.kind) {
        case "scalar":
            return writeScalar(field.T, value);
        case "enum":
            return writeEnum(field.T, value, options.enumAsInteger);
        case "message":
            return (0, field_wrapper_js_1.wrapField)(field.T, value).toJson(options);
    }
}
function writeEnum(type, value, enumAsInteger) {
    var _a;
    (0, assert_js_1.assert)(typeof value == "number");
    if (type.typeName == "google.protobuf.NullValue") {
        return null;
    }
    if (enumAsInteger) {
        return value;
    }
    const val = type.findNumber(value);
    return (_a = val === null || val === void 0 ? void 0 : val.name) !== null && _a !== void 0 ? _a : value; // if we don't know the enum value, just return the number
}
function writeScalar(type, value) {
    switch (type) {
        // int32, fixed32, uint32: JSON value will be a decimal number. Either numbers or strings are accepted.
        case scalar_js_1.ScalarType.INT32:
        case scalar_js_1.ScalarType.SFIXED32:
        case scalar_js_1.ScalarType.SINT32:
        case scalar_js_1.ScalarType.FIXED32:
        case scalar_js_1.ScalarType.UINT32:
            (0, assert_js_1.assert)(typeof value == "number");
            return value;
        // float, double: JSON value will be a number or one of the special string values "NaN", "Infinity", and "-Infinity".
        // Either numbers or strings are accepted. Exponent notation is also accepted.
        case scalar_js_1.ScalarType.FLOAT:
        // assertFloat32(value);
        case scalar_js_1.ScalarType.DOUBLE: // eslint-disable-line no-fallthrough
            (0, assert_js_1.assert)(typeof value == "number");
            if (Number.isNaN(value))
                return "NaN";
            if (value === Number.POSITIVE_INFINITY)
                return "Infinity";
            if (value === Number.NEGATIVE_INFINITY)
                return "-Infinity";
            return value;
        // string:
        case scalar_js_1.ScalarType.STRING:
            (0, assert_js_1.assert)(typeof value == "string");
            return value;
        // bool:
        case scalar_js_1.ScalarType.BOOL:
            (0, assert_js_1.assert)(typeof value == "boolean");
            return value;
        // JSON value will be a decimal string. Either numbers or strings are accepted.
        case scalar_js_1.ScalarType.UINT64:
        case scalar_js_1.ScalarType.FIXED64:
        case scalar_js_1.ScalarType.INT64:
        case scalar_js_1.ScalarType.SFIXED64:
        case scalar_js_1.ScalarType.SINT64:
            (0, assert_js_1.assert)(typeof value == "bigint" ||
                typeof value == "string" ||
                typeof value == "number");
            return value.toString();
        // bytes: JSON value will be the data encoded as a string using standard base64 encoding with paddings.
        // Either standard or URL-safe base64 encoding with/without paddings are accepted.
        case scalar_js_1.ScalarType.BYTES:
            (0, assert_js_1.assert)(value instanceof Uint8Array);
            return proto_base64_js_1.protoBase64.enc(value);
    }
}


/***/ }),
/* 23 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.protoBase64 = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unnecessary-condition, prefer-const */
// lookup table from base64 character to byte
let encTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
// lookup table from base64 character *code* to byte because lookup by number is fast
let decTable = [];
for (let i = 0; i < encTable.length; i++)
    decTable[encTable[i].charCodeAt(0)] = i;
// support base64url variants
decTable["-".charCodeAt(0)] = encTable.indexOf("+");
decTable["_".charCodeAt(0)] = encTable.indexOf("/");
exports.protoBase64 = {
    /**
     * Decodes a base64 string to a byte array.
     *
     * - ignores white-space, including line breaks and tabs
     * - allows inner padding (can decode concatenated base64 strings)
     * - does not require padding
     * - understands base64url encoding:
     *   "-" instead of "+",
     *   "_" instead of "/",
     *   no padding
     */
    dec(base64Str) {
        // estimate byte size, not accounting for inner padding and whitespace
        let es = (base64Str.length * 3) / 4;
        if (base64Str[base64Str.length - 2] == "=")
            es -= 2;
        else if (base64Str[base64Str.length - 1] == "=")
            es -= 1;
        let bytes = new Uint8Array(es), bytePos = 0, // position in byte array
        groupPos = 0, // position in base64 group
        b, // current byte
        p = 0; // previous byte
        for (let i = 0; i < base64Str.length; i++) {
            b = decTable[base64Str.charCodeAt(i)];
            if (b === undefined) {
                switch (base64Str[i]) {
                    // @ts-ignore TS7029: Fallthrough case in switch
                    case "=":
                        groupPos = 0; // reset state when padding found
                    // @ts-ignore TS7029: Fallthrough case in switch
                    case "\n":
                    case "\r":
                    case "\t":
                    case " ":
                        continue; // skip white-space, and padding
                    default:
                        throw Error("invalid base64 string.");
                }
            }
            switch (groupPos) {
                case 0:
                    p = b;
                    groupPos = 1;
                    break;
                case 1:
                    bytes[bytePos++] = (p << 2) | ((b & 48) >> 4);
                    p = b;
                    groupPos = 2;
                    break;
                case 2:
                    bytes[bytePos++] = ((p & 15) << 4) | ((b & 60) >> 2);
                    p = b;
                    groupPos = 3;
                    break;
                case 3:
                    bytes[bytePos++] = ((p & 3) << 6) | b;
                    groupPos = 0;
                    break;
            }
        }
        if (groupPos == 1)
            throw Error("invalid base64 string.");
        return bytes.subarray(0, bytePos);
    },
    /**
     * Encode a byte array to a base64 string.
     */
    enc(bytes) {
        let base64 = "", groupPos = 0, // position in base64 group
        b, // current byte
        p = 0; // carry over from previous byte
        for (let i = 0; i < bytes.length; i++) {
            b = bytes[i];
            switch (groupPos) {
                case 0:
                    base64 += encTable[b >> 2];
                    p = (b & 3) << 4;
                    groupPos = 1;
                    break;
                case 1:
                    base64 += encTable[p | (b >> 4)];
                    p = (b & 15) << 2;
                    groupPos = 2;
                    break;
                case 2:
                    base64 += encTable[p | (b >> 6)];
                    base64 += encTable[b & 63];
                    groupPos = 0;
                    break;
            }
        }
        // add output padding
        if (groupPos) {
            base64 += encTable[p];
            base64 += "=";
            if (groupPos == 1)
                base64 += "=";
        }
        return base64;
    },
};


/***/ }),
/* 24 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hasExtension = exports.clearExtension = exports.setExtension = exports.getExtension = void 0;
const assert_js_1 = __webpack_require__(14);
const extensions_js_1 = __webpack_require__(17);
/**
 * Retrieve an extension value from a message.
 *
 * The function never returns undefined. Use hasExtension() to check whether an
 * extension is set. If the extension is not set, this function returns the
 * default value (if one was specified in the protobuf source), or the zero value
 * (for example `0` for numeric types, `[]` for repeated extension fields, and
 * an empty message instance for message fields).
 *
 * Extensions are stored as unknown fields on a message. To mutate an extension
 * value, make sure to store the new value with setExtension() after mutating.
 *
 * If the extension does not extend the given message, an error is raised.
 */
function getExtension(message, extension, options) {
    assertExtendee(extension, message);
    const opt = extension.runtime.bin.makeReadOptions(options);
    const ufs = (0, extensions_js_1.filterUnknownFields)(message.getType().runtime.bin.listUnknownFields(message), extension.field);
    const [container, get] = (0, extensions_js_1.createExtensionContainer)(extension);
    for (const uf of ufs) {
        extension.runtime.bin.readField(container, opt.readerFactory(uf.data), extension.field, uf.wireType, opt);
    }
    return get();
}
exports.getExtension = getExtension;
/**
 * Set an extension value on a message. If the message already has a value for
 * this extension, the value is replaced.
 *
 * If the extension does not extend the given message, an error is raised.
 */
function setExtension(message, extension, value, options) {
    assertExtendee(extension, message);
    const readOpt = extension.runtime.bin.makeReadOptions(options);
    const writeOpt = extension.runtime.bin.makeWriteOptions(options);
    if (hasExtension(message, extension)) {
        const ufs = message
            .getType()
            .runtime.bin.listUnknownFields(message)
            .filter((uf) => uf.no != extension.field.no);
        message.getType().runtime.bin.discardUnknownFields(message);
        for (const uf of ufs) {
            message
                .getType()
                .runtime.bin.onUnknownField(message, uf.no, uf.wireType, uf.data);
        }
    }
    const writer = writeOpt.writerFactory();
    let f = extension.field;
    // Implicit presence does not apply to extensions, see https://github.com/protocolbuffers/protobuf/issues/8234
    // We patch the field info to use explicit presence:
    if (!f.opt && !f.repeated && (f.kind == "enum" || f.kind == "scalar")) {
        f = Object.assign(Object.assign({}, extension.field), { opt: true });
    }
    extension.runtime.bin.writeField(f, value, writer, writeOpt);
    const reader = readOpt.readerFactory(writer.finish());
    while (reader.pos < reader.len) {
        const [no, wireType] = reader.tag();
        const data = reader.skip(wireType, no);
        message.getType().runtime.bin.onUnknownField(message, no, wireType, data);
    }
}
exports.setExtension = setExtension;
/**
 * Remove an extension value from a message.
 *
 * If the extension does not extend the given message, an error is raised.
 */
function clearExtension(message, extension) {
    assertExtendee(extension, message);
    if (hasExtension(message, extension)) {
        const bin = message.getType().runtime.bin;
        const ufs = bin
            .listUnknownFields(message)
            .filter((uf) => uf.no != extension.field.no);
        bin.discardUnknownFields(message);
        for (const uf of ufs) {
            bin.onUnknownField(message, uf.no, uf.wireType, uf.data);
        }
    }
}
exports.clearExtension = clearExtension;
/**
 * Check whether an extension is set on a message.
 */
function hasExtension(message, extension) {
    const messageType = message.getType();
    return (extension.extendee.typeName === messageType.typeName &&
        !!messageType.runtime.bin
            .listUnknownFields(message)
            .find((uf) => uf.no == extension.field.no));
}
exports.hasExtension = hasExtension;
function assertExtendee(extension, message) {
    (0, assert_js_1.assert)(extension.extendee.typeName == message.getType().typeName, `extension ${extension.typeName} can only be applied to message ${extension.extendee.typeName}`);
}


/***/ }),
/* 25 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.clearField = exports.isFieldSet = void 0;
const scalars_js_1 = __webpack_require__(18);
/**
 * Returns true if the field is set.
 */
function isFieldSet(field, target) {
    const localName = field.localName;
    if (field.repeated) {
        return target[localName].length > 0;
    }
    if (field.oneof) {
        return target[field.oneof.localName].case === localName; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
    }
    switch (field.kind) {
        case "enum":
        case "scalar":
            if (field.opt || field.req) {
                // explicit presence
                return target[localName] !== undefined;
            }
            // implicit presence
            if (field.kind == "enum") {
                return target[localName] !== field.T.values[0].no;
            }
            return !(0, scalars_js_1.isScalarZeroValue)(field.T, target[localName]);
        case "message":
            return target[localName] !== undefined;
        case "map":
            return Object.keys(target[localName]).length > 0; // eslint-disable-line @typescript-eslint/no-unsafe-argument
    }
}
exports.isFieldSet = isFieldSet;
/**
 * Resets the field, so that isFieldSet() will return false.
 */
function clearField(field, target) {
    const localName = field.localName;
    const implicitPresence = !field.opt && !field.req;
    if (field.repeated) {
        target[localName] = [];
    }
    else if (field.oneof) {
        target[field.oneof.localName] = { case: undefined };
    }
    else {
        switch (field.kind) {
            case "map":
                target[localName] = {};
                break;
            case "enum":
                target[localName] = implicitPresence ? field.T.values[0].no : undefined;
                break;
            case "scalar":
                target[localName] = implicitPresence
                    ? (0, scalars_js_1.scalarZeroValue)(field.T, field.L)
                    : undefined;
                break;
            case "message":
                target[localName] = undefined;
                break;
        }
    }
}
exports.clearField = clearField;


/***/ }),
/* 26 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getUnwrappedFieldType = exports.wrapField = void 0;
const scalar_js_1 = __webpack_require__(21);
const is_message_js_1 = __webpack_require__(27);
/**
 * Wrap a primitive message field value in its corresponding wrapper
 * message. This function is idempotent.
 */
function wrapField(type, value) {
    if ((0, is_message_js_1.isMessage)(value) || !type.fieldWrapper) {
        return value;
    }
    return type.fieldWrapper.wrapField(value);
}
exports.wrapField = wrapField;
/**
 * If the given field uses one of the well-known wrapper types, return
 * the primitive type it wraps.
 */
function getUnwrappedFieldType(field) {
    if (field.fieldKind !== "message") {
        return undefined;
    }
    if (field.repeated) {
        return undefined;
    }
    if (field.oneof != undefined) {
        return undefined;
    }
    return wktWrapperToScalarType[field.message.typeName];
}
exports.getUnwrappedFieldType = getUnwrappedFieldType;
const wktWrapperToScalarType = {
    "google.protobuf.DoubleValue": scalar_js_1.ScalarType.DOUBLE,
    "google.protobuf.FloatValue": scalar_js_1.ScalarType.FLOAT,
    "google.protobuf.Int64Value": scalar_js_1.ScalarType.INT64,
    "google.protobuf.UInt64Value": scalar_js_1.ScalarType.UINT64,
    "google.protobuf.Int32Value": scalar_js_1.ScalarType.INT32,
    "google.protobuf.UInt32Value": scalar_js_1.ScalarType.UINT32,
    "google.protobuf.BoolValue": scalar_js_1.ScalarType.BOOL,
    "google.protobuf.StringValue": scalar_js_1.ScalarType.STRING,
    "google.protobuf.BytesValue": scalar_js_1.ScalarType.BYTES,
};


/***/ }),
/* 27 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isMessage = void 0;
const message_js_1 = __webpack_require__(16);
/**
 * Check whether the given object is any subtype of Message or is a specific
 * Message by passing the type.
 *
 * Just like `instanceof`, `isMessage` narrows the type. The advantage of
 * `isMessage` is that it compares identity by the message type name, not by
 * class identity. This makes it robust against the dual package hazard and
 * similar situations, where the same message is duplicated.
 *
 * This function is _mostly_ equivalent to the `instanceof` operator. For
 * example, `isMessage(foo, MyMessage)` is the same as `foo instanceof MyMessage`,
 * and `isMessage(foo)` is the same as `foo instanceof Message`. In most cases,
 * `isMessage` should be preferred over `instanceof`.
 *
 * However, due to the fact that `isMessage` does not use class identity, there
 * are subtle differences between this function and `instanceof`. Notably,
 * calling `isMessage` on an explicit type of Message will return false.
 */
function isMessage(arg, type) {
    if (arg === null || typeof arg != "object") {
        return false;
    }
    if (!Object.getOwnPropertyNames(message_js_1.Message.prototype).every((m) => m in arg && typeof arg[m] == "function")) {
        return false;
    }
    const actualType = arg.getType();
    if (actualType === null ||
        typeof actualType != "function" ||
        !("typeName" in actualType) ||
        typeof actualType.typeName != "string") {
        return false;
    }
    return type === undefined ? true : actualType.typeName == type.typeName;
}
exports.isMessage = isMessage;


/***/ }),
/* 28 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.writeMapEntry = exports.makeBinaryFormat = void 0;
const binary_encoding_js_1 = __webpack_require__(29);
const field_wrapper_js_1 = __webpack_require__(26);
const scalars_js_1 = __webpack_require__(18);
const assert_js_1 = __webpack_require__(14);
const reflect_js_1 = __webpack_require__(25);
const scalar_js_1 = __webpack_require__(21);
const is_message_js_1 = __webpack_require__(27);
/* eslint-disable prefer-const,no-case-declarations,@typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return */
const unknownFieldsSymbol = Symbol("@bufbuild/protobuf/unknown-fields");
// Default options for parsing binary data.
const readDefaults = {
    readUnknownFields: true,
    readerFactory: (bytes) => new binary_encoding_js_1.BinaryReader(bytes),
};
// Default options for serializing binary data.
const writeDefaults = {
    writeUnknownFields: true,
    writerFactory: () => new binary_encoding_js_1.BinaryWriter(),
};
function makeReadOptions(options) {
    return options ? Object.assign(Object.assign({}, readDefaults), options) : readDefaults;
}
function makeWriteOptions(options) {
    return options ? Object.assign(Object.assign({}, writeDefaults), options) : writeDefaults;
}
function makeBinaryFormat() {
    return {
        makeReadOptions,
        makeWriteOptions,
        listUnknownFields(message) {
            var _a;
            return (_a = message[unknownFieldsSymbol]) !== null && _a !== void 0 ? _a : [];
        },
        discardUnknownFields(message) {
            delete message[unknownFieldsSymbol];
        },
        writeUnknownFields(message, writer) {
            const m = message;
            const c = m[unknownFieldsSymbol];
            if (c) {
                for (const f of c) {
                    writer.tag(f.no, f.wireType).raw(f.data);
                }
            }
        },
        onUnknownField(message, no, wireType, data) {
            const m = message;
            if (!Array.isArray(m[unknownFieldsSymbol])) {
                m[unknownFieldsSymbol] = [];
            }
            m[unknownFieldsSymbol].push({ no, wireType, data });
        },
        readMessage(message, reader, lengthOrEndTagFieldNo, options, delimitedMessageEncoding) {
            const type = message.getType();
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            const end = delimitedMessageEncoding
                ? reader.len
                : reader.pos + lengthOrEndTagFieldNo;
            let fieldNo, wireType;
            while (reader.pos < end) {
                [fieldNo, wireType] = reader.tag();
                if (delimitedMessageEncoding === true &&
                    wireType == binary_encoding_js_1.WireType.EndGroup) {
                    break;
                }
                const field = type.fields.find(fieldNo);
                if (!field) {
                    const data = reader.skip(wireType, fieldNo);
                    if (options.readUnknownFields) {
                        this.onUnknownField(message, fieldNo, wireType, data);
                    }
                    continue;
                }
                readField(message, reader, field, wireType, options);
            }
            if (delimitedMessageEncoding && // eslint-disable-line @typescript-eslint/strict-boolean-expressions
                (wireType != binary_encoding_js_1.WireType.EndGroup || fieldNo !== lengthOrEndTagFieldNo)) {
                throw new Error(`invalid end group tag`);
            }
        },
        readField,
        writeMessage(message, writer, options) {
            const type = message.getType();
            for (const field of type.fields.byNumber()) {
                if (!(0, reflect_js_1.isFieldSet)(field, message)) {
                    if (field.req) {
                        throw new Error(`cannot encode field ${type.typeName}.${field.name} to binary: required field not set`);
                    }
                    continue;
                }
                const value = field.oneof
                    ? message[field.oneof.localName].value
                    : message[field.localName];
                writeField(field, value, writer, options);
            }
            if (options.writeUnknownFields) {
                this.writeUnknownFields(message, writer);
            }
            return writer;
        },
        writeField(field, value, writer, options) {
            // The behavior of our internal function has changed, it does no longer
            // accept `undefined` values for singular scalar and map.
            // For backwards-compatibility, we support the old form that is part of
            // the public API through the interface BinaryFormat.
            if (value === undefined) {
                return undefined;
            }
            writeField(field, value, writer, options);
        },
    };
}
exports.makeBinaryFormat = makeBinaryFormat;
function readField(target, // eslint-disable-line @typescript-eslint/no-explicit-any -- `any` is the best choice for dynamic access
reader, field, wireType, options) {
    let { repeated, localName } = field;
    if (field.oneof) {
        target = target[field.oneof.localName];
        if (target.case != localName) {
            delete target.value;
        }
        target.case = localName;
        localName = "value";
    }
    switch (field.kind) {
        case "scalar":
        case "enum":
            const scalarType = field.kind == "enum" ? scalar_js_1.ScalarType.INT32 : field.T;
            let read = readScalar;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- acceptable since it's covered by tests
            if (field.kind == "scalar" && field.L > 0) {
                read = readScalarLTString;
            }
            if (repeated) {
                let arr = target[localName]; // safe to assume presence of array, oneof cannot contain repeated values
                const isPacked = wireType == binary_encoding_js_1.WireType.LengthDelimited &&
                    scalarType != scalar_js_1.ScalarType.STRING &&
                    scalarType != scalar_js_1.ScalarType.BYTES;
                if (isPacked) {
                    let e = reader.uint32() + reader.pos;
                    while (reader.pos < e) {
                        arr.push(read(reader, scalarType));
                    }
                }
                else {
                    arr.push(read(reader, scalarType));
                }
            }
            else {
                target[localName] = read(reader, scalarType);
            }
            break;
        case "message":
            const messageType = field.T;
            if (repeated) {
                // safe to assume presence of array, oneof cannot contain repeated values
                target[localName].push(readMessageField(reader, new messageType(), options, field));
            }
            else {
                if ((0, is_message_js_1.isMessage)(target[localName])) {
                    readMessageField(reader, target[localName], options, field);
                }
                else {
                    target[localName] = readMessageField(reader, new messageType(), options, field);
                    if (messageType.fieldWrapper && !field.oneof && !field.repeated) {
                        target[localName] = messageType.fieldWrapper.unwrapField(target[localName]);
                    }
                }
            }
            break;
        case "map":
            let [mapKey, mapVal] = readMapEntry(field, reader, options);
            // safe to assume presence of map object, oneof cannot contain repeated values
            target[localName][mapKey] = mapVal;
            break;
    }
}
// Read a message, avoiding MessageType.fromBinary() to re-use the
// BinaryReadOptions and the IBinaryReader.
function readMessageField(reader, message, options, field) {
    const format = message.getType().runtime.bin;
    const delimited = field === null || field === void 0 ? void 0 : field.delimited;
    format.readMessage(message, reader, delimited ? field.no : reader.uint32(), // eslint-disable-line @typescript-eslint/strict-boolean-expressions
    options, delimited);
    return message;
}
// Read a map field, expecting key field = 1, value field = 2
function readMapEntry(field, reader, options) {
    const length = reader.uint32(), end = reader.pos + length;
    let key, val;
    while (reader.pos < end) {
        const [fieldNo] = reader.tag();
        switch (fieldNo) {
            case 1:
                key = readScalar(reader, field.K);
                break;
            case 2:
                switch (field.V.kind) {
                    case "scalar":
                        val = readScalar(reader, field.V.T);
                        break;
                    case "enum":
                        val = reader.int32();
                        break;
                    case "message":
                        val = readMessageField(reader, new field.V.T(), options, undefined);
                        break;
                }
                break;
        }
    }
    if (key === undefined) {
        key = (0, scalars_js_1.scalarZeroValue)(field.K, scalar_js_1.LongType.BIGINT);
    }
    if (typeof key != "string" && typeof key != "number") {
        key = key.toString();
    }
    if (val === undefined) {
        switch (field.V.kind) {
            case "scalar":
                val = (0, scalars_js_1.scalarZeroValue)(field.V.T, scalar_js_1.LongType.BIGINT);
                break;
            case "enum":
                val = field.V.T.values[0].no;
                break;
            case "message":
                val = new field.V.T();
                break;
        }
    }
    return [key, val];
}
// Read a scalar value, but return 64 bit integral types (int64, uint64,
// sint64, fixed64, sfixed64) as string instead of bigint.
function readScalarLTString(reader, type) {
    const v = readScalar(reader, type);
    return typeof v == "bigint" ? v.toString() : v;
}
// Does not use scalarTypeInfo() for better performance.
function readScalar(reader, type) {
    switch (type) {
        case scalar_js_1.ScalarType.STRING:
            return reader.string();
        case scalar_js_1.ScalarType.BOOL:
            return reader.bool();
        case scalar_js_1.ScalarType.DOUBLE:
            return reader.double();
        case scalar_js_1.ScalarType.FLOAT:
            return reader.float();
        case scalar_js_1.ScalarType.INT32:
            return reader.int32();
        case scalar_js_1.ScalarType.INT64:
            return reader.int64();
        case scalar_js_1.ScalarType.UINT64:
            return reader.uint64();
        case scalar_js_1.ScalarType.FIXED64:
            return reader.fixed64();
        case scalar_js_1.ScalarType.BYTES:
            return reader.bytes();
        case scalar_js_1.ScalarType.FIXED32:
            return reader.fixed32();
        case scalar_js_1.ScalarType.SFIXED32:
            return reader.sfixed32();
        case scalar_js_1.ScalarType.SFIXED64:
            return reader.sfixed64();
        case scalar_js_1.ScalarType.SINT64:
            return reader.sint64();
        case scalar_js_1.ScalarType.UINT32:
            return reader.uint32();
        case scalar_js_1.ScalarType.SINT32:
            return reader.sint32();
    }
}
function writeField(field, value, writer, options) {
    (0, assert_js_1.assert)(value !== undefined);
    const repeated = field.repeated;
    switch (field.kind) {
        case "scalar":
        case "enum":
            let scalarType = field.kind == "enum" ? scalar_js_1.ScalarType.INT32 : field.T;
            if (repeated) {
                (0, assert_js_1.assert)(Array.isArray(value));
                if (field.packed) {
                    writePacked(writer, scalarType, field.no, value);
                }
                else {
                    for (const item of value) {
                        writeScalar(writer, scalarType, field.no, item);
                    }
                }
            }
            else {
                writeScalar(writer, scalarType, field.no, value);
            }
            break;
        case "message":
            if (repeated) {
                (0, assert_js_1.assert)(Array.isArray(value));
                for (const item of value) {
                    writeMessageField(writer, options, field, item);
                }
            }
            else {
                writeMessageField(writer, options, field, value);
            }
            break;
        case "map":
            (0, assert_js_1.assert)(typeof value == "object" && value != null);
            for (const [key, val] of Object.entries(value)) {
                writeMapEntry(writer, options, field, key, val);
            }
            break;
    }
}
function writeMapEntry(writer, options, field, key, value) {
    writer.tag(field.no, binary_encoding_js_1.WireType.LengthDelimited);
    writer.fork();
    // javascript only allows number or string for object properties
    // we convert from our representation to the protobuf type
    let keyValue = key;
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- we deliberately handle just the special cases for map keys
    switch (field.K) {
        case scalar_js_1.ScalarType.INT32:
        case scalar_js_1.ScalarType.FIXED32:
        case scalar_js_1.ScalarType.UINT32:
        case scalar_js_1.ScalarType.SFIXED32:
        case scalar_js_1.ScalarType.SINT32:
            keyValue = Number.parseInt(key);
            break;
        case scalar_js_1.ScalarType.BOOL:
            (0, assert_js_1.assert)(key == "true" || key == "false");
            keyValue = key == "true";
            break;
    }
    // write key, expecting key field number = 1
    writeScalar(writer, field.K, 1, keyValue);
    // write value, expecting value field number = 2
    switch (field.V.kind) {
        case "scalar":
            writeScalar(writer, field.V.T, 2, value);
            break;
        case "enum":
            writeScalar(writer, scalar_js_1.ScalarType.INT32, 2, value);
            break;
        case "message":
            (0, assert_js_1.assert)(value !== undefined);
            writer.tag(2, binary_encoding_js_1.WireType.LengthDelimited).bytes(value.toBinary(options));
            break;
    }
    writer.join();
}
exports.writeMapEntry = writeMapEntry;
// Value must not be undefined
function writeMessageField(writer, options, field, value) {
    const message = (0, field_wrapper_js_1.wrapField)(field.T, value);
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (field.delimited)
        writer
            .tag(field.no, binary_encoding_js_1.WireType.StartGroup)
            .raw(message.toBinary(options))
            .tag(field.no, binary_encoding_js_1.WireType.EndGroup);
    else
        writer
            .tag(field.no, binary_encoding_js_1.WireType.LengthDelimited)
            .bytes(message.toBinary(options));
}
function writeScalar(writer, type, fieldNo, value) {
    (0, assert_js_1.assert)(value !== undefined);
    let [wireType, method] = scalarTypeInfo(type);
    writer.tag(fieldNo, wireType)[method](value);
}
function writePacked(writer, type, fieldNo, value) {
    if (!value.length) {
        return;
    }
    writer.tag(fieldNo, binary_encoding_js_1.WireType.LengthDelimited).fork();
    let [, method] = scalarTypeInfo(type);
    for (let i = 0; i < value.length; i++) {
        writer[method](value[i]);
    }
    writer.join();
}
/**
 * Get information for writing a scalar value.
 *
 * Returns tuple:
 * [0]: appropriate WireType
 * [1]: name of the appropriate method of IBinaryWriter
 * [2]: whether the given value is a default value for proto3 semantics
 *
 * If argument `value` is omitted, [2] is always false.
 */
// TODO replace call-sites writeScalar() and writePacked(), then remove
function scalarTypeInfo(type) {
    let wireType = binary_encoding_js_1.WireType.Varint;
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- INT32, UINT32, SINT32 are covered by the defaults
    switch (type) {
        case scalar_js_1.ScalarType.BYTES:
        case scalar_js_1.ScalarType.STRING:
            wireType = binary_encoding_js_1.WireType.LengthDelimited;
            break;
        case scalar_js_1.ScalarType.DOUBLE:
        case scalar_js_1.ScalarType.FIXED64:
        case scalar_js_1.ScalarType.SFIXED64:
            wireType = binary_encoding_js_1.WireType.Bit64;
            break;
        case scalar_js_1.ScalarType.FIXED32:
        case scalar_js_1.ScalarType.SFIXED32:
        case scalar_js_1.ScalarType.FLOAT:
            wireType = binary_encoding_js_1.WireType.Bit32;
            break;
    }
    const method = scalar_js_1.ScalarType[type].toLowerCase();
    return [wireType, method];
}


/***/ }),
/* 29 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BinaryReader = exports.BinaryWriter = exports.WireType = void 0;
const varint_js_1 = __webpack_require__(20);
const assert_js_1 = __webpack_require__(14);
const proto_int64_js_1 = __webpack_require__(19);
/* eslint-disable prefer-const,no-case-declarations,@typescript-eslint/restrict-plus-operands */
/**
 * Protobuf binary format wire types.
 *
 * A wire type provides just enough information to find the length of the
 * following value.
 *
 * See https://developers.google.com/protocol-buffers/docs/encoding#structure
 */
var WireType;
(function (WireType) {
    /**
     * Used for int32, int64, uint32, uint64, sint32, sint64, bool, enum
     */
    WireType[WireType["Varint"] = 0] = "Varint";
    /**
     * Used for fixed64, sfixed64, double.
     * Always 8 bytes with little-endian byte order.
     */
    WireType[WireType["Bit64"] = 1] = "Bit64";
    /**
     * Used for string, bytes, embedded messages, packed repeated fields
     *
     * Only repeated numeric types (types which use the varint, 32-bit,
     * or 64-bit wire types) can be packed. In proto3, such fields are
     * packed by default.
     */
    WireType[WireType["LengthDelimited"] = 2] = "LengthDelimited";
    /**
     * Start of a tag-delimited aggregate, such as a proto2 group, or a message
     * in editions with message_encoding = DELIMITED.
     */
    WireType[WireType["StartGroup"] = 3] = "StartGroup";
    /**
     * End of a tag-delimited aggregate.
     */
    WireType[WireType["EndGroup"] = 4] = "EndGroup";
    /**
     * Used for fixed32, sfixed32, float.
     * Always 4 bytes with little-endian byte order.
     */
    WireType[WireType["Bit32"] = 5] = "Bit32";
})(WireType || (exports.WireType = WireType = {}));
class BinaryWriter {
    constructor(textEncoder) {
        /**
         * Previous fork states.
         */
        this.stack = [];
        this.textEncoder = textEncoder !== null && textEncoder !== void 0 ? textEncoder : new TextEncoder();
        this.chunks = [];
        this.buf = [];
    }
    /**
     * Return all bytes written and reset this writer.
     */
    finish() {
        this.chunks.push(new Uint8Array(this.buf)); // flush the buffer
        let len = 0;
        for (let i = 0; i < this.chunks.length; i++)
            len += this.chunks[i].length;
        let bytes = new Uint8Array(len);
        let offset = 0;
        for (let i = 0; i < this.chunks.length; i++) {
            bytes.set(this.chunks[i], offset);
            offset += this.chunks[i].length;
        }
        this.chunks = [];
        return bytes;
    }
    /**
     * Start a new fork for length-delimited data like a message
     * or a packed repeated field.
     *
     * Must be joined later with `join()`.
     */
    fork() {
        this.stack.push({ chunks: this.chunks, buf: this.buf });
        this.chunks = [];
        this.buf = [];
        return this;
    }
    /**
     * Join the last fork. Write its length and bytes, then
     * return to the previous state.
     */
    join() {
        // get chunk of fork
        let chunk = this.finish();
        // restore previous state
        let prev = this.stack.pop();
        if (!prev)
            throw new Error("invalid state, fork stack empty");
        this.chunks = prev.chunks;
        this.buf = prev.buf;
        // write length of chunk as varint
        this.uint32(chunk.byteLength);
        return this.raw(chunk);
    }
    /**
     * Writes a tag (field number and wire type).
     *
     * Equivalent to `uint32( (fieldNo << 3 | type) >>> 0 )`.
     *
     * Generated code should compute the tag ahead of time and call `uint32()`.
     */
    tag(fieldNo, type) {
        return this.uint32(((fieldNo << 3) | type) >>> 0);
    }
    /**
     * Write a chunk of raw bytes.
     */
    raw(chunk) {
        if (this.buf.length) {
            this.chunks.push(new Uint8Array(this.buf));
            this.buf = [];
        }
        this.chunks.push(chunk);
        return this;
    }
    /**
     * Write a `uint32` value, an unsigned 32 bit varint.
     */
    uint32(value) {
        (0, assert_js_1.assertUInt32)(value);
        // write value as varint 32, inlined for speed
        while (value > 0x7f) {
            this.buf.push((value & 0x7f) | 0x80);
            value = value >>> 7;
        }
        this.buf.push(value);
        return this;
    }
    /**
     * Write a `int32` value, a signed 32 bit varint.
     */
    int32(value) {
        (0, assert_js_1.assertInt32)(value);
        (0, varint_js_1.varint32write)(value, this.buf);
        return this;
    }
    /**
     * Write a `bool` value, a variant.
     */
    bool(value) {
        this.buf.push(value ? 1 : 0);
        return this;
    }
    /**
     * Write a `bytes` value, length-delimited arbitrary data.
     */
    bytes(value) {
        this.uint32(value.byteLength); // write length of chunk as varint
        return this.raw(value);
    }
    /**
     * Write a `string` value, length-delimited data converted to UTF-8 text.
     */
    string(value) {
        let chunk = this.textEncoder.encode(value);
        this.uint32(chunk.byteLength); // write length of chunk as varint
        return this.raw(chunk);
    }
    /**
     * Write a `float` value, 32-bit floating point number.
     */
    float(value) {
        (0, assert_js_1.assertFloat32)(value);
        let chunk = new Uint8Array(4);
        new DataView(chunk.buffer).setFloat32(0, value, true);
        return this.raw(chunk);
    }
    /**
     * Write a `double` value, a 64-bit floating point number.
     */
    double(value) {
        let chunk = new Uint8Array(8);
        new DataView(chunk.buffer).setFloat64(0, value, true);
        return this.raw(chunk);
    }
    /**
     * Write a `fixed32` value, an unsigned, fixed-length 32-bit integer.
     */
    fixed32(value) {
        (0, assert_js_1.assertUInt32)(value);
        let chunk = new Uint8Array(4);
        new DataView(chunk.buffer).setUint32(0, value, true);
        return this.raw(chunk);
    }
    /**
     * Write a `sfixed32` value, a signed, fixed-length 32-bit integer.
     */
    sfixed32(value) {
        (0, assert_js_1.assertInt32)(value);
        let chunk = new Uint8Array(4);
        new DataView(chunk.buffer).setInt32(0, value, true);
        return this.raw(chunk);
    }
    /**
     * Write a `sint32` value, a signed, zigzag-encoded 32-bit varint.
     */
    sint32(value) {
        (0, assert_js_1.assertInt32)(value);
        // zigzag encode
        value = ((value << 1) ^ (value >> 31)) >>> 0;
        (0, varint_js_1.varint32write)(value, this.buf);
        return this;
    }
    /**
     * Write a `fixed64` value, a signed, fixed-length 64-bit integer.
     */
    sfixed64(value) {
        let chunk = new Uint8Array(8), view = new DataView(chunk.buffer), tc = proto_int64_js_1.protoInt64.enc(value);
        view.setInt32(0, tc.lo, true);
        view.setInt32(4, tc.hi, true);
        return this.raw(chunk);
    }
    /**
     * Write a `fixed64` value, an unsigned, fixed-length 64 bit integer.
     */
    fixed64(value) {
        let chunk = new Uint8Array(8), view = new DataView(chunk.buffer), tc = proto_int64_js_1.protoInt64.uEnc(value);
        view.setInt32(0, tc.lo, true);
        view.setInt32(4, tc.hi, true);
        return this.raw(chunk);
    }
    /**
     * Write a `int64` value, a signed 64-bit varint.
     */
    int64(value) {
        let tc = proto_int64_js_1.protoInt64.enc(value);
        (0, varint_js_1.varint64write)(tc.lo, tc.hi, this.buf);
        return this;
    }
    /**
     * Write a `sint64` value, a signed, zig-zag-encoded 64-bit varint.
     */
    sint64(value) {
        let tc = proto_int64_js_1.protoInt64.enc(value),
        // zigzag encode
        sign = tc.hi >> 31, lo = (tc.lo << 1) ^ sign, hi = ((tc.hi << 1) | (tc.lo >>> 31)) ^ sign;
        (0, varint_js_1.varint64write)(lo, hi, this.buf);
        return this;
    }
    /**
     * Write a `uint64` value, an unsigned 64-bit varint.
     */
    uint64(value) {
        let tc = proto_int64_js_1.protoInt64.uEnc(value);
        (0, varint_js_1.varint64write)(tc.lo, tc.hi, this.buf);
        return this;
    }
}
exports.BinaryWriter = BinaryWriter;
class BinaryReader {
    constructor(buf, textDecoder) {
        this.varint64 = varint_js_1.varint64read; // dirty cast for `this`
        /**
         * Read a `uint32` field, an unsigned 32 bit varint.
         */
        this.uint32 = varint_js_1.varint32read; // dirty cast for `this` and access to protected `buf`
        this.buf = buf;
        this.len = buf.length;
        this.pos = 0;
        this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        this.textDecoder = textDecoder !== null && textDecoder !== void 0 ? textDecoder : new TextDecoder();
    }
    /**
     * Reads a tag - field number and wire type.
     */
    tag() {
        let tag = this.uint32(), fieldNo = tag >>> 3, wireType = tag & 7;
        if (fieldNo <= 0 || wireType < 0 || wireType > 5)
            throw new Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
        return [fieldNo, wireType];
    }
    /**
     * Skip one element and return the skipped data.
     *
     * When skipping StartGroup, provide the tags field number to check for
     * matching field number in the EndGroup tag.
     */
    skip(wireType, fieldNo) {
        let start = this.pos;
        switch (wireType) {
            case WireType.Varint:
                while (this.buf[this.pos++] & 0x80) {
                    // ignore
                }
                break;
            // eslint-disable-next-line
            // @ts-ignore TS7029: Fallthrough case in switch
            case WireType.Bit64:
                this.pos += 4;
            // eslint-disable-next-line
            // @ts-ignore TS7029: Fallthrough case in switch
            case WireType.Bit32:
                this.pos += 4;
                break;
            case WireType.LengthDelimited:
                let len = this.uint32();
                this.pos += len;
                break;
            case WireType.StartGroup:
                for (;;) {
                    const [fn, wt] = this.tag();
                    if (wt === WireType.EndGroup) {
                        if (fieldNo !== undefined && fn !== fieldNo) {
                            throw new Error("invalid end group tag");
                        }
                        break;
                    }
                    this.skip(wt, fn);
                }
                break;
            default:
                throw new Error("cant skip wire type " + wireType);
        }
        this.assertBounds();
        return this.buf.subarray(start, this.pos);
    }
    /**
     * Throws error if position in byte array is out of range.
     */
    assertBounds() {
        if (this.pos > this.len)
            throw new RangeError("premature EOF");
    }
    /**
     * Read a `int32` field, a signed 32 bit varint.
     */
    int32() {
        return this.uint32() | 0;
    }
    /**
     * Read a `sint32` field, a signed, zigzag-encoded 32-bit varint.
     */
    sint32() {
        let zze = this.uint32();
        // decode zigzag
        return (zze >>> 1) ^ -(zze & 1);
    }
    /**
     * Read a `int64` field, a signed 64-bit varint.
     */
    int64() {
        return proto_int64_js_1.protoInt64.dec(...this.varint64());
    }
    /**
     * Read a `uint64` field, an unsigned 64-bit varint.
     */
    uint64() {
        return proto_int64_js_1.protoInt64.uDec(...this.varint64());
    }
    /**
     * Read a `sint64` field, a signed, zig-zag-encoded 64-bit varint.
     */
    sint64() {
        let [lo, hi] = this.varint64();
        // decode zig zag
        let s = -(lo & 1);
        lo = ((lo >>> 1) | ((hi & 1) << 31)) ^ s;
        hi = (hi >>> 1) ^ s;
        return proto_int64_js_1.protoInt64.dec(lo, hi);
    }
    /**
     * Read a `bool` field, a variant.
     */
    bool() {
        let [lo, hi] = this.varint64();
        return lo !== 0 || hi !== 0;
    }
    /**
     * Read a `fixed32` field, an unsigned, fixed-length 32-bit integer.
     */
    fixed32() {
        return this.view.getUint32((this.pos += 4) - 4, true);
    }
    /**
     * Read a `sfixed32` field, a signed, fixed-length 32-bit integer.
     */
    sfixed32() {
        return this.view.getInt32((this.pos += 4) - 4, true);
    }
    /**
     * Read a `fixed64` field, an unsigned, fixed-length 64 bit integer.
     */
    fixed64() {
        return proto_int64_js_1.protoInt64.uDec(this.sfixed32(), this.sfixed32());
    }
    /**
     * Read a `fixed64` field, a signed, fixed-length 64-bit integer.
     */
    sfixed64() {
        return proto_int64_js_1.protoInt64.dec(this.sfixed32(), this.sfixed32());
    }
    /**
     * Read a `float` field, 32-bit floating point number.
     */
    float() {
        return this.view.getFloat32((this.pos += 4) - 4, true);
    }
    /**
     * Read a `double` field, a 64-bit floating point number.
     */
    double() {
        return this.view.getFloat64((this.pos += 8) - 8, true);
    }
    /**
     * Read a `bytes` field, length-delimited arbitrary data.
     */
    bytes() {
        let len = this.uint32(), start = this.pos;
        this.pos += len;
        this.assertBounds();
        return this.buf.subarray(start, start + len);
    }
    /**
     * Read a `string` field, length-delimited data converted to UTF-8 text.
     */
    string() {
        return this.textDecoder.decode(this.bytes());
    }
}
exports.BinaryReader = BinaryReader;


/***/ }),
/* 30 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.makeUtilCommon = void 0;
const enum_js_1 = __webpack_require__(13);
const scalars_js_1 = __webpack_require__(18);
const scalar_js_1 = __webpack_require__(21);
const is_message_js_1 = __webpack_require__(27);
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-argument,no-case-declarations */
function makeUtilCommon() {
    return {
        setEnumType: enum_js_1.setEnumType,
        initPartial(source, target) {
            if (source === undefined) {
                return;
            }
            const type = target.getType();
            for (const member of type.fields.byMember()) {
                const localName = member.localName, t = target, s = source;
                if (s[localName] == null) {
                    // TODO if source is a Message instance, we should use isFieldSet() here to support future field presence
                    continue;
                }
                switch (member.kind) {
                    case "oneof":
                        const sk = s[localName].case;
                        if (sk === undefined) {
                            continue;
                        }
                        const sourceField = member.findField(sk);
                        let val = s[localName].value;
                        if (sourceField &&
                            sourceField.kind == "message" &&
                            !(0, is_message_js_1.isMessage)(val, sourceField.T)) {
                            val = new sourceField.T(val);
                        }
                        else if (sourceField &&
                            sourceField.kind === "scalar" &&
                            sourceField.T === scalar_js_1.ScalarType.BYTES) {
                            val = toU8Arr(val);
                        }
                        t[localName] = { case: sk, value: val };
                        break;
                    case "scalar":
                    case "enum":
                        let copy = s[localName];
                        if (member.T === scalar_js_1.ScalarType.BYTES) {
                            copy = member.repeated
                                ? copy.map(toU8Arr)
                                : toU8Arr(copy);
                        }
                        t[localName] = copy;
                        break;
                    case "map":
                        switch (member.V.kind) {
                            case "scalar":
                            case "enum":
                                if (member.V.T === scalar_js_1.ScalarType.BYTES) {
                                    for (const [k, v] of Object.entries(s[localName])) {
                                        t[localName][k] = toU8Arr(v);
                                    }
                                }
                                else {
                                    Object.assign(t[localName], s[localName]);
                                }
                                break;
                            case "message":
                                const messageType = member.V.T;
                                for (const k of Object.keys(s[localName])) {
                                    let val = s[localName][k];
                                    if (!messageType.fieldWrapper) {
                                        // We only take partial input for messages that are not a wrapper type.
                                        // For those messages, we recursively normalize the partial input.
                                        val = new messageType(val);
                                    }
                                    t[localName][k] = val;
                                }
                                break;
                        }
                        break;
                    case "message":
                        const mt = member.T;
                        if (member.repeated) {
                            t[localName] = s[localName].map((val) => (0, is_message_js_1.isMessage)(val, mt) ? val : new mt(val));
                        }
                        else {
                            const val = s[localName];
                            if (mt.fieldWrapper) {
                                if (
                                // We can't use BytesValue.typeName as that will create a circular import
                                mt.typeName === "google.protobuf.BytesValue") {
                                    t[localName] = toU8Arr(val);
                                }
                                else {
                                    t[localName] = val;
                                }
                            }
                            else {
                                t[localName] = (0, is_message_js_1.isMessage)(val, mt) ? val : new mt(val);
                            }
                        }
                        break;
                }
            }
        },
        // TODO use isFieldSet() here to support future field presence
        equals(type, a, b) {
            if (a === b) {
                return true;
            }
            if (!a || !b) {
                return false;
            }
            return type.fields.byMember().every((m) => {
                const va = a[m.localName];
                const vb = b[m.localName];
                if (m.repeated) {
                    if (va.length !== vb.length) {
                        return false;
                    }
                    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- repeated fields are never "map"
                    switch (m.kind) {
                        case "message":
                            return va.every((a, i) => m.T.equals(a, vb[i]));
                        case "scalar":
                            return va.every((a, i) => (0, scalars_js_1.scalarEquals)(m.T, a, vb[i]));
                        case "enum":
                            return va.every((a, i) => (0, scalars_js_1.scalarEquals)(scalar_js_1.ScalarType.INT32, a, vb[i]));
                    }
                    throw new Error(`repeated cannot contain ${m.kind}`);
                }
                switch (m.kind) {
                    case "message":
                        let a = va;
                        let b = vb;
                        if (m.T.fieldWrapper) {
                            if (a !== undefined && !(0, is_message_js_1.isMessage)(a)) {
                                a = m.T.fieldWrapper.wrapField(a);
                            }
                            if (b !== undefined && !(0, is_message_js_1.isMessage)(b)) {
                                b = m.T.fieldWrapper.wrapField(b);
                            }
                        }
                        return m.T.equals(a, b);
                    case "enum":
                        return (0, scalars_js_1.scalarEquals)(scalar_js_1.ScalarType.INT32, va, vb);
                    case "scalar":
                        return (0, scalars_js_1.scalarEquals)(m.T, va, vb);
                    case "oneof":
                        if (va.case !== vb.case) {
                            return false;
                        }
                        const s = m.findField(va.case);
                        if (s === undefined) {
                            return true;
                        }
                        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- oneof fields are never "map"
                        switch (s.kind) {
                            case "message":
                                return s.T.equals(va.value, vb.value);
                            case "enum":
                                return (0, scalars_js_1.scalarEquals)(scalar_js_1.ScalarType.INT32, va.value, vb.value);
                            case "scalar":
                                return (0, scalars_js_1.scalarEquals)(s.T, va.value, vb.value);
                        }
                        throw new Error(`oneof cannot contain ${s.kind}`);
                    case "map":
                        const keys = Object.keys(va).concat(Object.keys(vb));
                        switch (m.V.kind) {
                            case "message":
                                const messageType = m.V.T;
                                return keys.every((k) => messageType.equals(va[k], vb[k]));
                            case "enum":
                                return keys.every((k) => (0, scalars_js_1.scalarEquals)(scalar_js_1.ScalarType.INT32, va[k], vb[k]));
                            case "scalar":
                                const scalarType = m.V.T;
                                return keys.every((k) => (0, scalars_js_1.scalarEquals)(scalarType, va[k], vb[k]));
                        }
                        break;
                }
            });
        },
        // TODO use isFieldSet() here to support future field presence
        clone(message) {
            const type = message.getType(), target = new type(), any = target;
            for (const member of type.fields.byMember()) {
                const source = message[member.localName];
                let copy;
                if (member.repeated) {
                    copy = source.map(cloneSingularField);
                }
                else if (member.kind == "map") {
                    copy = any[member.localName];
                    for (const [key, v] of Object.entries(source)) {
                        copy[key] = cloneSingularField(v);
                    }
                }
                else if (member.kind == "oneof") {
                    const f = member.findField(source.case);
                    copy = f
                        ? { case: source.case, value: cloneSingularField(source.value) }
                        : { case: undefined };
                }
                else {
                    copy = cloneSingularField(source);
                }
                any[member.localName] = copy;
            }
            for (const uf of type.runtime.bin.listUnknownFields(message)) {
                type.runtime.bin.onUnknownField(any, uf.no, uf.wireType, uf.data);
            }
            return target;
        },
    };
}
exports.makeUtilCommon = makeUtilCommon;
// clone a single field value - i.e. the element type of repeated fields, the value type of maps
function cloneSingularField(value) {
    if (value === undefined) {
        return value;
    }
    if ((0, is_message_js_1.isMessage)(value)) {
        return value.clone();
    }
    if (value instanceof Uint8Array) {
        const c = new Uint8Array(value.byteLength);
        c.set(value);
        return c;
    }
    return value;
}
// converts any ArrayLike<number> to Uint8Array if necessary.
function toU8Arr(input) {
    return input instanceof Uint8Array ? input : new Uint8Array(input);
}


/***/ }),
/* 31 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InternalFieldList = void 0;
class InternalFieldList {
    constructor(fields, normalizer) {
        this._fields = fields;
        this._normalizer = normalizer;
    }
    findJsonName(jsonName) {
        if (!this.jsonNames) {
            const t = {};
            for (const f of this.list()) {
                t[f.jsonName] = t[f.name] = f;
            }
            this.jsonNames = t;
        }
        return this.jsonNames[jsonName];
    }
    find(fieldNo) {
        if (!this.numbers) {
            const t = {};
            for (const f of this.list()) {
                t[f.no] = f;
            }
            this.numbers = t;
        }
        return this.numbers[fieldNo];
    }
    list() {
        if (!this.all) {
            this.all = this._normalizer(this._fields);
        }
        return this.all;
    }
    byNumber() {
        if (!this.numbersAsc) {
            this.numbersAsc = this.list()
                .concat()
                .sort((a, b) => a.no - b.no);
        }
        return this.numbersAsc;
    }
    byMember() {
        if (!this.members) {
            this.members = [];
            const a = this.members;
            let o;
            for (const f of this.list()) {
                if (f.oneof) {
                    if (f.oneof !== o) {
                        o = f.oneof;
                        a.push(o);
                    }
                }
                else {
                    a.push(f);
                }
            }
        }
        return this.members;
    }
}
exports.InternalFieldList = InternalFieldList;


/***/ }),
/* 32 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.normalizeFieldInfos = void 0;
const field_js_1 = __webpack_require__(33);
const names_js_1 = __webpack_require__(34);
const scalar_js_1 = __webpack_require__(21);
/**
 * Convert a collection of field info to an array of normalized FieldInfo.
 *
 * The argument `packedByDefault` specifies whether fields that do not specify
 * `packed` should be packed (proto3) or unpacked (proto2).
 */
function normalizeFieldInfos(fieldInfos, packedByDefault) {
    var _a, _b, _c, _d, _e, _f;
    const r = [];
    let o;
    for (const field of typeof fieldInfos == "function"
        ? fieldInfos()
        : fieldInfos) {
        const f = field;
        f.localName = (0, names_js_1.localFieldName)(field.name, field.oneof !== undefined);
        f.jsonName = (_a = field.jsonName) !== null && _a !== void 0 ? _a : (0, names_js_1.fieldJsonName)(field.name);
        f.repeated = (_b = field.repeated) !== null && _b !== void 0 ? _b : false;
        if (field.kind == "scalar") {
            f.L = (_c = field.L) !== null && _c !== void 0 ? _c : scalar_js_1.LongType.BIGINT;
        }
        f.delimited = (_d = field.delimited) !== null && _d !== void 0 ? _d : false;
        f.req = (_e = field.req) !== null && _e !== void 0 ? _e : false;
        f.opt = (_f = field.opt) !== null && _f !== void 0 ? _f : false;
        if (field.packed === undefined) {
            if (packedByDefault) {
                f.packed =
                    field.kind == "enum" ||
                        (field.kind == "scalar" &&
                            field.T != scalar_js_1.ScalarType.BYTES &&
                            field.T != scalar_js_1.ScalarType.STRING);
            }
            else {
                f.packed = false;
            }
        }
        // We do not surface options at this time
        // f.options = field.options ?? emptyReadonlyObject;
        if (field.oneof !== undefined) {
            const ooname = typeof field.oneof == "string" ? field.oneof : field.oneof.name;
            if (!o || o.name != ooname) {
                o = new field_js_1.InternalOneofInfo(ooname);
            }
            f.oneof = o;
            o.addField(f);
        }
        r.push(f);
    }
    return r;
}
exports.normalizeFieldInfos = normalizeFieldInfos;


/***/ }),
/* 33 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InternalOneofInfo = void 0;
const names_js_1 = __webpack_require__(34);
const assert_js_1 = __webpack_require__(14);
class InternalOneofInfo {
    constructor(name) {
        this.kind = "oneof";
        this.repeated = false;
        this.packed = false;
        this.opt = false;
        this.req = false;
        this.default = undefined;
        this.fields = [];
        this.name = name;
        this.localName = (0, names_js_1.localOneofName)(name);
    }
    addField(field) {
        (0, assert_js_1.assert)(field.oneof === this, `field ${field.name} not one of ${this.name}`);
        this.fields.push(field);
    }
    findField(localName) {
        if (!this._lookup) {
            this._lookup = Object.create(null);
            for (let i = 0; i < this.fields.length; i++) {
                this._lookup[this.fields[i].localName] = this.fields[i];
            }
        }
        return this._lookup[localName];
    }
}
exports.InternalOneofInfo = InternalOneofInfo;


/***/ }),
/* 34 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.safeIdentifier = exports.safeObjectProperty = exports.findEnumSharedPrefix = exports.fieldJsonName = exports.localOneofName = exports.localFieldName = exports.localName = void 0;
/**
 * Returns the name of a protobuf element in generated code.
 *
 * Field names - including oneofs - are converted to lowerCamelCase. For
 * messages, enumerations and services, the package name is stripped from
 * the type name. For nested messages and enumerations, the names are joined
 * with an underscore. For methods, the first character is made lowercase.
 */
function localName(desc) {
    switch (desc.kind) {
        case "field":
            return localFieldName(desc.name, desc.oneof !== undefined);
        case "oneof":
            return localOneofName(desc.name);
        case "enum":
        case "message":
        case "service":
        case "extension": {
            const pkg = desc.file.proto.package;
            const offset = pkg === undefined ? 0 : pkg.length + 1;
            const name = desc.typeName.substring(offset).replace(/\./g, "_");
            // For services, we only care about safe identifiers, not safe object properties,
            // but we have shipped v1 with a bug that respected object properties, and we
            // do not want to introduce a breaking change, so we continue to escape for
            // safe object properties.
            // See https://github.com/bufbuild/protobuf-es/pull/391
            return (0, exports.safeObjectProperty)((0, exports.safeIdentifier)(name));
        }
        case "enum_value": {
            let name = desc.name;
            const sharedPrefix = desc.parent.sharedPrefix;
            if (sharedPrefix !== undefined) {
                name = name.substring(sharedPrefix.length);
            }
            return (0, exports.safeObjectProperty)(name);
        }
        case "rpc": {
            let name = desc.name;
            if (name.length == 0) {
                return name;
            }
            name = name[0].toLowerCase() + name.substring(1);
            return (0, exports.safeObjectProperty)(name);
        }
    }
}
exports.localName = localName;
/**
 * Returns the name of a field in generated code.
 */
function localFieldName(protoName, inOneof) {
    const name = protoCamelCase(protoName);
    if (inOneof) {
        // oneof member names are not properties, but values of the `case` property.
        return name;
    }
    return (0, exports.safeObjectProperty)(safeMessageProperty(name));
}
exports.localFieldName = localFieldName;
/**
 * Returns the name of a oneof group in generated code.
 */
function localOneofName(protoName) {
    return localFieldName(protoName, false);
}
exports.localOneofName = localOneofName;
/**
 * Returns the JSON name for a protobuf field, exactly like protoc does.
 */
exports.fieldJsonName = protoCamelCase;
/**
 * Finds a prefix shared by enum values, for example `MY_ENUM_` for
 * `enum MyEnum {MY_ENUM_A=0; MY_ENUM_B=1;}`.
 */
function findEnumSharedPrefix(enumName, valueNames) {
    const prefix = camelToSnakeCase(enumName) + "_";
    for (const name of valueNames) {
        if (!name.toLowerCase().startsWith(prefix)) {
            return undefined;
        }
        const shortName = name.substring(prefix.length);
        if (shortName.length == 0) {
            return undefined;
        }
        if (/^\d/.test(shortName)) {
            // identifiers must not start with numbers
            return undefined;
        }
    }
    return prefix;
}
exports.findEnumSharedPrefix = findEnumSharedPrefix;
/**
 * Converts lowerCamelCase or UpperCamelCase into lower_snake_case.
 * This is used to find shared prefixes in an enum.
 */
function camelToSnakeCase(camel) {
    return (camel.substring(0, 1) + camel.substring(1).replace(/[A-Z]/g, (c) => "_" + c)).toLowerCase();
}
/**
 * Converts snake_case to protoCamelCase according to the convention
 * used by protoc to convert a field name to a JSON name.
 */
function protoCamelCase(snakeCase) {
    let capNext = false;
    const b = [];
    for (let i = 0; i < snakeCase.length; i++) {
        let c = snakeCase.charAt(i);
        switch (c) {
            case "_":
                capNext = true;
                break;
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
                b.push(c);
                capNext = false;
                break;
            default:
                if (capNext) {
                    capNext = false;
                    c = c.toUpperCase();
                }
                b.push(c);
                break;
        }
    }
    return b.join("");
}
/**
 * Names that cannot be used for identifiers, such as class names,
 * but _can_ be used for object properties.
 */
const reservedIdentifiers = new Set([
    // ECMAScript 2015 keywords
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
    // ECMAScript 2015 future reserved keywords
    "enum",
    "implements",
    "interface",
    "let",
    "package",
    "private",
    "protected",
    "public",
    "static",
    // Class name cannot be 'Object' when targeting ES5 with module CommonJS
    "Object",
    // TypeScript keywords that cannot be used for types (as opposed to variables)
    "bigint",
    "number",
    "boolean",
    "string",
    "object",
    // Identifiers reserved for the runtime, so we can generate legible code
    "globalThis",
    "Uint8Array",
    "Partial",
]);
/**
 * Names that cannot be used for object properties because they are reserved
 * by built-in JavaScript properties.
 */
const reservedObjectProperties = new Set([
    // names reserved by JavaScript
    "constructor",
    "toString",
    "toJSON",
    "valueOf",
]);
/**
 * Names that cannot be used for object properties because they are reserved
 * by the runtime.
 */
const reservedMessageProperties = new Set([
    // names reserved by the runtime
    "getType",
    "clone",
    "equals",
    "fromBinary",
    "fromJson",
    "fromJsonString",
    "toBinary",
    "toJson",
    "toJsonString",
    // names reserved by the runtime for the future
    "toObject",
]);
const fallback = (name) => `${name}$`;
/**
 * Will wrap names that are Object prototype properties or names reserved
 * for `Message`s.
 */
const safeMessageProperty = (name) => {
    if (reservedMessageProperties.has(name)) {
        return fallback(name);
    }
    return name;
};
/**
 * Names that cannot be used for object properties because they are reserved
 * by built-in JavaScript properties.
 */
const safeObjectProperty = (name) => {
    if (reservedObjectProperties.has(name)) {
        return fallback(name);
    }
    return name;
};
exports.safeObjectProperty = safeObjectProperty;
/**
 * Names that can be used for identifiers or class properties
 */
const safeIdentifier = (name) => {
    if (reservedIdentifiers.has(name)) {
        return fallback(name);
    }
    return name;
};
exports.safeIdentifier = safeIdentifier;


/***/ }),
/* 35 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.proto2 = void 0;
const proto_runtime_js_1 = __webpack_require__(12);
const field_list_js_1 = __webpack_require__(31);
const field_normalize_js_1 = __webpack_require__(32);
/**
 * Provides functionality for messages defined with the proto2 syntax.
 */
exports.proto2 = (0, proto_runtime_js_1.makeProtoRuntime)("proto2", (fields) => {
    return new field_list_js_1.InternalFieldList(fields, (source) => (0, field_normalize_js_1.normalizeFieldInfos)(source, false));
},
// TODO merge with proto3 and initExtensionField, also see initPartial, equals, clone
(target) => {
    for (const member of target.getType().fields.byMember()) {
        const name = member.localName, t = target;
        if (member.repeated) {
            t[name] = [];
            continue;
        }
        switch (member.kind) {
            case "oneof":
                t[name] = { case: undefined };
                break;
            case "map":
                t[name] = {};
                break;
            case "scalar":
            case "enum":
            case "message":
                // In contrast to proto3, enum and scalar fields have no intrinsic default value,
                // only an optional explicit default value.
                // Unlike proto3 intrinsic default values, proto2 explicit default values are not
                // set on construction, because they are not omitted on the wire. If we did set
                // default values on construction, a deserialize-serialize round-trip would add
                // fields to a message.
                break;
        }
    }
});


/***/ }),
/* 36 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.protoDouble = void 0;
// Export global Number constants. This is done so that we can safely use
// these global constants when generating code and be assured we're using
// the correct values. We cannot rely on globalThis since we support ES2017
// and globalThis was introduced in ES2020. We also don't want to explicitly
// generate code using, for example, Number.NaN, since this could clash with
// a message name of Number. Instead we can export them here since this will
// be in a different scope as the generated code and we are guaranteed to use
// the intended global values.
exports.protoDouble = {
    NaN: Number.NaN,
    POSITIVE_INFINITY: Number.POSITIVE_INFINITY,
    NEGATIVE_INFINITY: Number.NEGATIVE_INFINITY,
};


/***/ }),
/* 37 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.protoDelimited = void 0;
const binary_encoding_js_1 = __webpack_require__(29);
/**
 * protoDelimited provides functions to serialize and parse size-delimited
 * messages.
 *
 * A size-delimited message is a varint size in bytes, followed by exactly
 * that many bytes of a message serialized with the binary format.
 *
 * This size-delimited format is compatible with other implementations.
 * For details, see https://github.com/protocolbuffers/protobuf/issues/10229
 */
exports.protoDelimited = {
    /**
     * Serialize a message, prefixing it with its size.
     */
    enc(message, options) {
        const opt = message.getType().runtime.bin.makeWriteOptions(options);
        return opt.writerFactory().bytes(message.toBinary(opt)).finish();
    },
    /**
     * Parse a size-delimited message, ignoring extra bytes.
     */
    dec(type, bytes, options) {
        const opt = type.runtime.bin.makeReadOptions(options);
        return type.fromBinary(opt.readerFactory(bytes).bytes(), opt);
    },
    /**
     * Parse a stream of size-delimited messages.
     */
    decStream(type, iterable) {
        return __asyncGenerator(this, arguments, function* decStream_1() {
            var _a, e_1, _b, _c;
            // append chunk to buffer, returning updated buffer
            function append(buffer, chunk) {
                const n = new Uint8Array(buffer.byteLength + chunk.byteLength);
                n.set(buffer);
                n.set(chunk, buffer.length);
                return n;
            }
            let buffer = new Uint8Array(0);
            try {
                for (var _d = true, iterable_1 = __asyncValues(iterable), iterable_1_1; iterable_1_1 = yield __await(iterable_1.next()), _a = iterable_1_1.done, !_a; _d = true) {
                    _c = iterable_1_1.value;
                    _d = false;
                    const chunk = _c;
                    buffer = append(buffer, chunk);
                    for (;;) {
                        const size = exports.protoDelimited.peekSize(buffer);
                        if (size.eof) {
                            // size is incomplete, buffer more data
                            break;
                        }
                        if (size.offset + size.size > buffer.byteLength) {
                            // message is incomplete, buffer more data
                            break;
                        }
                        yield yield __await(exports.protoDelimited.dec(type, buffer));
                        buffer = buffer.subarray(size.offset + size.size);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_1.return)) yield __await(_b.call(iterable_1));
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (buffer.byteLength > 0) {
                throw new Error("incomplete data");
            }
        });
    },
    /**
     * Decodes the size from the given size-delimited message, which may be
     * incomplete.
     *
     * Returns an object with the following properties:
     * - size: The size of the delimited message in bytes
     * - offset: The offset in the given byte array where the message starts
     * - eof: true
     *
     * If the size-delimited data does not include all bytes of the varint size,
     * the following object is returned:
     * - size: null
     * - offset: null
     * - eof: false
     *
     * This function can be used to implement parsing of size-delimited messages
     * from a stream.
     */
    peekSize(data) {
        const sizeEof = { eof: true, size: null, offset: null };
        for (let i = 0; i < 10; i++) {
            if (i > data.byteLength) {
                return sizeEof;
            }
            if ((data[i] & 0x80) == 0) {
                const reader = new binary_encoding_js_1.BinaryReader(data);
                let size;
                try {
                    size = reader.uint32();
                }
                catch (e) {
                    if (e instanceof RangeError) {
                        return sizeEof;
                    }
                    throw e;
                }
                return {
                    eof: false,
                    size,
                    offset: reader.pos,
                };
            }
        }
        throw new Error("invalid varint");
    },
};


/***/ }),
/* 38 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.codegenInfo = void 0;
const names_js_1 = __webpack_require__(34);
const field_wrapper_js_1 = __webpack_require__(26);
const scalars_js_1 = __webpack_require__(18);
const reify_wkt_js_1 = __webpack_require__(39);
const packageName = "@bufbuild/protobuf";
exports.codegenInfo = {
    packageName: "@bufbuild/protobuf",
    localName: names_js_1.localName,
    reifyWkt: reify_wkt_js_1.reifyWkt,
    getUnwrappedFieldType: field_wrapper_js_1.getUnwrappedFieldType,
    scalarDefaultValue: scalars_js_1.scalarZeroValue,
    scalarZeroValue: scalars_js_1.scalarZeroValue,
    safeIdentifier: names_js_1.safeIdentifier,
    safeObjectProperty: names_js_1.safeObjectProperty,
    // prettier-ignore
    symbols: {
        proto2: { typeOnly: false, privateImportPath: "./proto2.js", publicImportPath: packageName },
        proto3: { typeOnly: false, privateImportPath: "./proto3.js", publicImportPath: packageName },
        Message: { typeOnly: false, privateImportPath: "./message.js", publicImportPath: packageName },
        PartialMessage: { typeOnly: true, privateImportPath: "./message.js", publicImportPath: packageName },
        PlainMessage: { typeOnly: true, privateImportPath: "./message.js", publicImportPath: packageName },
        FieldList: { typeOnly: true, privateImportPath: "./field-list.js", publicImportPath: packageName },
        MessageType: { typeOnly: true, privateImportPath: "./message-type.js", publicImportPath: packageName },
        Extension: { typeOnly: true, privateImportPath: "./extension.js", publicImportPath: packageName },
        BinaryReadOptions: { typeOnly: true, privateImportPath: "./binary-format.js", publicImportPath: packageName },
        BinaryWriteOptions: { typeOnly: true, privateImportPath: "./binary-format.js", publicImportPath: packageName },
        JsonReadOptions: { typeOnly: true, privateImportPath: "./json-format.js", publicImportPath: packageName },
        JsonWriteOptions: { typeOnly: true, privateImportPath: "./json-format.js", publicImportPath: packageName },
        JsonValue: { typeOnly: true, privateImportPath: "./json-format.js", publicImportPath: packageName },
        JsonObject: { typeOnly: true, privateImportPath: "./json-format.js", publicImportPath: packageName },
        protoDouble: { typeOnly: false, privateImportPath: "./proto-double.js", publicImportPath: packageName },
        protoInt64: { typeOnly: false, privateImportPath: "./proto-int64.js", publicImportPath: packageName },
        ScalarType: { typeOnly: false, privateImportPath: "./scalar.js", publicImportPath: packageName },
        LongType: { typeOnly: false, privateImportPath: "./scalar.js", publicImportPath: packageName },
        MethodKind: { typeOnly: false, privateImportPath: "./service-type.js", publicImportPath: packageName },
        MethodIdempotency: { typeOnly: false, privateImportPath: "./service-type.js", publicImportPath: packageName },
        IMessageTypeRegistry: { typeOnly: true, privateImportPath: "./type-registry.js", publicImportPath: packageName },
    },
    wktSourceFiles: [
        "google/protobuf/compiler/plugin.proto",
        "google/protobuf/any.proto",
        "google/protobuf/api.proto",
        "google/protobuf/descriptor.proto",
        "google/protobuf/duration.proto",
        "google/protobuf/empty.proto",
        "google/protobuf/field_mask.proto",
        "google/protobuf/source_context.proto",
        "google/protobuf/struct.proto",
        "google/protobuf/timestamp.proto",
        "google/protobuf/type.proto",
        "google/protobuf/wrappers.proto",
    ],
};


/***/ }),
/* 39 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.reifyWkt = void 0;
const scalar_js_1 = __webpack_require__(21);
/**
 * @deprecated please use reifyWkt from @bufbuild/protoplugin/ecmascript instead
 *
 * Reifies a given DescMessage into a more concrete object representing its
 * respective well-known type.  The returned object will contain properties
 * representing the WKT's defined fields.
 *
 * Useful during code generation when immediate access to a particular field
 * is needed without having to search the object's typename and DescField list.
 *
 * Returns undefined if the WKT cannot be completely constructed via the
 * DescMessage.
 */
function reifyWkt(message) {
    switch (message.typeName) {
        case "google.protobuf.Any": {
            const typeUrl = message.fields.find((f) => f.number == 1 &&
                f.fieldKind == "scalar" &&
                f.scalar === scalar_js_1.ScalarType.STRING);
            const value = message.fields.find((f) => f.number == 2 &&
                f.fieldKind == "scalar" &&
                f.scalar === scalar_js_1.ScalarType.BYTES);
            if (typeUrl && value) {
                return {
                    typeName: message.typeName,
                    typeUrl,
                    value,
                };
            }
            break;
        }
        case "google.protobuf.Timestamp": {
            const seconds = message.fields.find((f) => f.number == 1 &&
                f.fieldKind == "scalar" &&
                f.scalar === scalar_js_1.ScalarType.INT64);
            const nanos = message.fields.find((f) => f.number == 2 &&
                f.fieldKind == "scalar" &&
                f.scalar === scalar_js_1.ScalarType.INT32);
            if (seconds && nanos) {
                return {
                    typeName: message.typeName,
                    seconds,
                    nanos,
                };
            }
            break;
        }
        case "google.protobuf.Duration": {
            const seconds = message.fields.find((f) => f.number == 1 &&
                f.fieldKind == "scalar" &&
                f.scalar === scalar_js_1.ScalarType.INT64);
            const nanos = message.fields.find((f) => f.number == 2 &&
                f.fieldKind == "scalar" &&
                f.scalar === scalar_js_1.ScalarType.INT32);
            if (seconds && nanos) {
                return {
                    typeName: message.typeName,
                    seconds,
                    nanos,
                };
            }
            break;
        }
        case "google.protobuf.Struct": {
            const fields = message.fields.find((f) => f.number == 1 && !f.repeated);
            if ((fields === null || fields === void 0 ? void 0 : fields.fieldKind) !== "map" ||
                fields.mapValue.kind !== "message" ||
                fields.mapValue.message.typeName !== "google.protobuf.Value") {
                break;
            }
            return { typeName: message.typeName, fields };
        }
        case "google.protobuf.Value": {
            const kind = message.oneofs.find((o) => o.name === "kind");
            const nullValue = message.fields.find((f) => f.number == 1 && f.oneof === kind);
            if ((nullValue === null || nullValue === void 0 ? void 0 : nullValue.fieldKind) !== "enum" ||
                nullValue.enum.typeName !== "google.protobuf.NullValue") {
                return undefined;
            }
            const numberValue = message.fields.find((f) => f.number == 2 &&
                f.fieldKind == "scalar" &&
                f.scalar === scalar_js_1.ScalarType.DOUBLE &&
                f.oneof === kind);
            const stringValue = message.fields.find((f) => f.number == 3 &&
                f.fieldKind == "scalar" &&
                f.scalar === scalar_js_1.ScalarType.STRING &&
                f.oneof === kind);
            const boolValue = message.fields.find((f) => f.number == 4 &&
                f.fieldKind == "scalar" &&
                f.scalar === scalar_js_1.ScalarType.BOOL &&
                f.oneof === kind);
            const structValue = message.fields.find((f) => f.number == 5 && f.oneof === kind);
            if ((structValue === null || structValue === void 0 ? void 0 : structValue.fieldKind) !== "message" ||
                structValue.message.typeName !== "google.protobuf.Struct") {
                return undefined;
            }
            const listValue = message.fields.find((f) => f.number == 6 && f.oneof === kind);
            if ((listValue === null || listValue === void 0 ? void 0 : listValue.fieldKind) !== "message" ||
                listValue.message.typeName !== "google.protobuf.ListValue") {
                return undefined;
            }
            if (kind && numberValue && stringValue && boolValue) {
                return {
                    typeName: message.typeName,
                    kind,
                    nullValue,
                    numberValue,
                    stringValue,
                    boolValue,
                    structValue,
                    listValue,
                };
            }
            break;
        }
        case "google.protobuf.ListValue": {
            const values = message.fields.find((f) => f.number == 1 && f.repeated);
            if ((values === null || values === void 0 ? void 0 : values.fieldKind) != "message" ||
                values.message.typeName !== "google.protobuf.Value") {
                break;
            }
            return { typeName: message.typeName, values };
        }
        case "google.protobuf.FieldMask": {
            const paths = message.fields.find((f) => f.number == 1 &&
                f.fieldKind == "scalar" &&
                f.scalar === scalar_js_1.ScalarType.STRING &&
                f.repeated);
            if (paths) {
                return { typeName: message.typeName, paths };
            }
            break;
        }
        case "google.protobuf.DoubleValue":
        case "google.protobuf.FloatValue":
        case "google.protobuf.Int64Value":
        case "google.protobuf.UInt64Value":
        case "google.protobuf.Int32Value":
        case "google.protobuf.UInt32Value":
        case "google.protobuf.BoolValue":
        case "google.protobuf.StringValue":
        case "google.protobuf.BytesValue": {
            const value = message.fields.find((f) => f.number == 1 && f.name == "value");
            if (!value) {
                break;
            }
            if (value.fieldKind !== "scalar") {
                break;
            }
            return { typeName: message.typeName, value };
        }
    }
    return undefined;
}
exports.reifyWkt = reifyWkt;


/***/ }),
/* 40 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MethodIdempotency = exports.MethodKind = void 0;
/**
 * MethodKind represents the four method types that can be declared in
 * protobuf with the `stream` keyword:
 *
 * 1. Unary:           rpc (Input) returns (Output)
 * 2. ServerStreaming: rpc (Input) returns (stream Output)
 * 3. ClientStreaming: rpc (stream Input) returns (Output)
 * 4. BiDiStreaming:   rpc (stream Input) returns (stream Output)
 */
var MethodKind;
(function (MethodKind) {
    MethodKind[MethodKind["Unary"] = 0] = "Unary";
    MethodKind[MethodKind["ServerStreaming"] = 1] = "ServerStreaming";
    MethodKind[MethodKind["ClientStreaming"] = 2] = "ClientStreaming";
    MethodKind[MethodKind["BiDiStreaming"] = 3] = "BiDiStreaming";
})(MethodKind || (exports.MethodKind = MethodKind = {}));
/**
 * Is this method side-effect-free (or safe in HTTP parlance), or just
 * idempotent, or neither? HTTP based RPC implementation may choose GET verb
 * for safe methods, and PUT verb for idempotent methods instead of the
 * default POST.
 *
 * This enum matches the protobuf enum google.protobuf.MethodOptions.IdempotencyLevel,
 * defined in the well-known type google/protobuf/descriptor.proto, but
 * drops UNKNOWN.
 */
var MethodIdempotency;
(function (MethodIdempotency) {
    /**
     * Idempotent, no side effects.
     */
    MethodIdempotency[MethodIdempotency["NoSideEffects"] = 1] = "NoSideEffects";
    /**
     * Idempotent, but may have side effects.
     */
    MethodIdempotency[MethodIdempotency["Idempotent"] = 2] = "Idempotent";
})(MethodIdempotency || (exports.MethodIdempotency = MethodIdempotency = {}));


/***/ }),
/* 41 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createDescriptorSet = void 0;
const descriptor_pb_js_1 = __webpack_require__(42);
const assert_js_1 = __webpack_require__(14);
const service_type_js_1 = __webpack_require__(40);
const names_js_1 = __webpack_require__(34);
const text_format_js_1 = __webpack_require__(43);
const feature_set_js_1 = __webpack_require__(44);
const scalar_js_1 = __webpack_require__(21);
const is_message_js_1 = __webpack_require__(27);
/**
 * Create a DescriptorSet, a convenient interface for working with a set of
 * google.protobuf.FileDescriptorProto.
 *
 * Note that files must be given in topological order, so each file appears
 * before any file that imports it. Protocol buffer compilers always produce
 * files in topological order.
 */
function createDescriptorSet(input, options) {
    var _a;
    const cart = {
        files: [],
        enums: new Map(),
        messages: new Map(),
        services: new Map(),
        extensions: new Map(),
        mapEntries: new Map(),
    };
    const fileDescriptors = (0, is_message_js_1.isMessage)(input, descriptor_pb_js_1.FileDescriptorSet)
        ? input.file
        : input instanceof Uint8Array
            ? descriptor_pb_js_1.FileDescriptorSet.fromBinary(input).file
            : input;
    const resolverByEdition = new Map();
    for (const proto of fileDescriptors) {
        const edition = (_a = proto.edition) !== null && _a !== void 0 ? _a : parseFileSyntax(proto.syntax, proto.edition).edition;
        let resolveFeatures = resolverByEdition.get(edition);
        if (resolveFeatures === undefined) {
            resolveFeatures = (0, feature_set_js_1.createFeatureResolver)(edition, options === null || options === void 0 ? void 0 : options.featureSetDefaults, options === null || options === void 0 ? void 0 : options.serializationOptions);
            resolverByEdition.set(edition, resolveFeatures);
        }
        addFile(proto, cart, resolveFeatures);
    }
    return cart;
}
exports.createDescriptorSet = createDescriptorSet;
/**
 * Create a descriptor for a file.
 */
function addFile(proto, cart, resolveFeatures) {
    var _a, _b;
    (0, assert_js_1.assert)(proto.name, `invalid FileDescriptorProto: missing name`);
    const file = Object.assign(Object.assign({ kind: "file", proto, deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false }, parseFileSyntax(proto.syntax, proto.edition)), { name: proto.name.replace(/\.proto/, ""), dependencies: findFileDependencies(proto, cart), enums: [], messages: [], extensions: [], services: [], toString() {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- we asserted above
            return `file ${this.proto.name}`;
        },
        getSyntaxComments() {
            return findComments(this.proto.sourceCodeInfo, [
                FieldNumber.FileDescriptorProto_Syntax,
            ]);
        },
        getPackageComments() {
            return findComments(this.proto.sourceCodeInfo, [
                FieldNumber.FileDescriptorProto_Package,
            ]);
        },
        getFeatures() {
            var _a;
            return resolveFeatures((_a = proto.options) === null || _a === void 0 ? void 0 : _a.features);
        } });
    cart.mapEntries.clear(); // map entries are local to the file, we can safely discard
    for (const enumProto of proto.enumType) {
        addEnum(enumProto, file, undefined, cart, resolveFeatures);
    }
    for (const messageProto of proto.messageType) {
        addMessage(messageProto, file, undefined, cart, resolveFeatures);
    }
    for (const serviceProto of proto.service) {
        addService(serviceProto, file, cart, resolveFeatures);
    }
    addExtensions(file, cart, resolveFeatures);
    for (const mapEntry of cart.mapEntries.values()) {
        addFields(mapEntry, cart, resolveFeatures);
    }
    for (const message of file.messages) {
        addFields(message, cart, resolveFeatures);
        addExtensions(message, cart, resolveFeatures);
    }
    cart.mapEntries.clear(); // map entries are local to the file, we can safely discard
    cart.files.push(file);
}
/**
 * Create descriptors for extensions, and add them to the message / file,
 * and to our cart.
 * Recurses into nested types.
 */
function addExtensions(desc, cart, resolveFeatures) {
    switch (desc.kind) {
        case "file":
            for (const proto of desc.proto.extension) {
                const ext = newExtension(proto, desc, undefined, cart, resolveFeatures);
                desc.extensions.push(ext);
                cart.extensions.set(ext.typeName, ext);
            }
            break;
        case "message":
            for (const proto of desc.proto.extension) {
                const ext = newExtension(proto, desc.file, desc, cart, resolveFeatures);
                desc.nestedExtensions.push(ext);
                cart.extensions.set(ext.typeName, ext);
            }
            for (const message of desc.nestedMessages) {
                addExtensions(message, cart, resolveFeatures);
            }
            break;
    }
}
/**
 * Create descriptors for fields and oneof groups, and add them to the message.
 * Recurses into nested types.
 */
function addFields(message, cart, resolveFeatures) {
    const allOneofs = message.proto.oneofDecl.map((proto) => newOneof(proto, message, resolveFeatures));
    const oneofsSeen = new Set();
    for (const proto of message.proto.field) {
        const oneof = findOneof(proto, allOneofs);
        const field = newField(proto, message.file, message, oneof, cart, resolveFeatures);
        message.fields.push(field);
        if (oneof === undefined) {
            message.members.push(field);
        }
        else {
            oneof.fields.push(field);
            if (!oneofsSeen.has(oneof)) {
                oneofsSeen.add(oneof);
                message.members.push(oneof);
            }
        }
    }
    for (const oneof of allOneofs.filter((o) => oneofsSeen.has(o))) {
        message.oneofs.push(oneof);
    }
    for (const child of message.nestedMessages) {
        addFields(child, cart, resolveFeatures);
    }
}
/**
 * Create a descriptor for an enumeration, and add it our cart and to the
 * parent type, if any.
 */
function addEnum(proto, file, parent, cart, resolveFeatures) {
    var _a, _b, _c;
    (0, assert_js_1.assert)(proto.name, `invalid EnumDescriptorProto: missing name`);
    const desc = {
        kind: "enum",
        proto,
        deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
        file,
        parent,
        name: proto.name,
        typeName: makeTypeName(proto, parent, file),
        values: [],
        sharedPrefix: (0, names_js_1.findEnumSharedPrefix)(proto.name, proto.value.map((v) => { var _a; return (_a = v.name) !== null && _a !== void 0 ? _a : ""; })),
        toString() {
            return `enum ${this.typeName}`;
        },
        getComments() {
            const path = this.parent
                ? [
                    ...this.parent.getComments().sourcePath,
                    FieldNumber.DescriptorProto_EnumType,
                    this.parent.proto.enumType.indexOf(this.proto),
                ]
                : [
                    FieldNumber.FileDescriptorProto_EnumType,
                    this.file.proto.enumType.indexOf(this.proto),
                ];
            return findComments(file.proto.sourceCodeInfo, path);
        },
        getFeatures() {
            var _a, _b;
            return resolveFeatures((_a = parent === null || parent === void 0 ? void 0 : parent.getFeatures()) !== null && _a !== void 0 ? _a : file.getFeatures(), (_b = proto.options) === null || _b === void 0 ? void 0 : _b.features);
        },
    };
    cart.enums.set(desc.typeName, desc);
    proto.value.forEach((proto) => {
        var _a, _b;
        (0, assert_js_1.assert)(proto.name, `invalid EnumValueDescriptorProto: missing name`);
        (0, assert_js_1.assert)(proto.number !== undefined, `invalid EnumValueDescriptorProto: missing number`);
        desc.values.push({
            kind: "enum_value",
            proto,
            deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
            parent: desc,
            name: proto.name,
            number: proto.number,
            toString() {
                return `enum value ${desc.typeName}.${this.name}`;
            },
            declarationString() {
                var _a;
                let str = `${this.name} = ${this.number}`;
                if (((_a = this.proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) === true) {
                    str += " [deprecated = true]";
                }
                return str;
            },
            getComments() {
                const path = [
                    ...this.parent.getComments().sourcePath,
                    FieldNumber.EnumDescriptorProto_Value,
                    this.parent.proto.value.indexOf(this.proto),
                ];
                return findComments(file.proto.sourceCodeInfo, path);
            },
            getFeatures() {
                var _a;
                return resolveFeatures(desc.getFeatures(), (_a = proto.options) === null || _a === void 0 ? void 0 : _a.features);
            },
        });
    });
    ((_c = parent === null || parent === void 0 ? void 0 : parent.nestedEnums) !== null && _c !== void 0 ? _c : file.enums).push(desc);
}
/**
 * Create a descriptor for a message, including nested types, and add it to our
 * cart. Note that this does not create descriptors fields.
 */
function addMessage(proto, file, parent, cart, resolveFeatures) {
    var _a, _b, _c, _d;
    (0, assert_js_1.assert)(proto.name, `invalid DescriptorProto: missing name`);
    const desc = {
        kind: "message",
        proto,
        deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
        file,
        parent,
        name: proto.name,
        typeName: makeTypeName(proto, parent, file),
        fields: [],
        oneofs: [],
        members: [],
        nestedEnums: [],
        nestedMessages: [],
        nestedExtensions: [],
        toString() {
            return `message ${this.typeName}`;
        },
        getComments() {
            const path = this.parent
                ? [
                    ...this.parent.getComments().sourcePath,
                    FieldNumber.DescriptorProto_NestedType,
                    this.parent.proto.nestedType.indexOf(this.proto),
                ]
                : [
                    FieldNumber.FileDescriptorProto_MessageType,
                    this.file.proto.messageType.indexOf(this.proto),
                ];
            return findComments(file.proto.sourceCodeInfo, path);
        },
        getFeatures() {
            var _a, _b;
            return resolveFeatures((_a = parent === null || parent === void 0 ? void 0 : parent.getFeatures()) !== null && _a !== void 0 ? _a : file.getFeatures(), (_b = proto.options) === null || _b === void 0 ? void 0 : _b.features);
        },
    };
    if (((_c = proto.options) === null || _c === void 0 ? void 0 : _c.mapEntry) === true) {
        cart.mapEntries.set(desc.typeName, desc);
    }
    else {
        ((_d = parent === null || parent === void 0 ? void 0 : parent.nestedMessages) !== null && _d !== void 0 ? _d : file.messages).push(desc);
        cart.messages.set(desc.typeName, desc);
    }
    for (const enumProto of proto.enumType) {
        addEnum(enumProto, file, desc, cart, resolveFeatures);
    }
    for (const messageProto of proto.nestedType) {
        addMessage(messageProto, file, desc, cart, resolveFeatures);
    }
}
/**
 * Create a descriptor for a service, including methods, and add it to our
 * cart.
 */
function addService(proto, file, cart, resolveFeatures) {
    var _a, _b;
    (0, assert_js_1.assert)(proto.name, `invalid ServiceDescriptorProto: missing name`);
    const desc = {
        kind: "service",
        proto,
        deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
        file,
        name: proto.name,
        typeName: makeTypeName(proto, undefined, file),
        methods: [],
        toString() {
            return `service ${this.typeName}`;
        },
        getComments() {
            const path = [
                FieldNumber.FileDescriptorProto_Service,
                this.file.proto.service.indexOf(this.proto),
            ];
            return findComments(file.proto.sourceCodeInfo, path);
        },
        getFeatures() {
            var _a;
            return resolveFeatures(file.getFeatures(), (_a = proto.options) === null || _a === void 0 ? void 0 : _a.features);
        },
    };
    file.services.push(desc);
    cart.services.set(desc.typeName, desc);
    for (const methodProto of proto.method) {
        desc.methods.push(newMethod(methodProto, desc, cart, resolveFeatures));
    }
}
/**
 * Create a descriptor for a method.
 */
function newMethod(proto, parent, cart, resolveFeatures) {
    var _a, _b, _c;
    (0, assert_js_1.assert)(proto.name, `invalid MethodDescriptorProto: missing name`);
    (0, assert_js_1.assert)(proto.inputType, `invalid MethodDescriptorProto: missing input_type`);
    (0, assert_js_1.assert)(proto.outputType, `invalid MethodDescriptorProto: missing output_type`);
    let methodKind;
    if (proto.clientStreaming === true && proto.serverStreaming === true) {
        methodKind = service_type_js_1.MethodKind.BiDiStreaming;
    }
    else if (proto.clientStreaming === true) {
        methodKind = service_type_js_1.MethodKind.ClientStreaming;
    }
    else if (proto.serverStreaming === true) {
        methodKind = service_type_js_1.MethodKind.ServerStreaming;
    }
    else {
        methodKind = service_type_js_1.MethodKind.Unary;
    }
    let idempotency;
    switch ((_a = proto.options) === null || _a === void 0 ? void 0 : _a.idempotencyLevel) {
        case descriptor_pb_js_1.MethodOptions_IdempotencyLevel.IDEMPOTENT:
            idempotency = service_type_js_1.MethodIdempotency.Idempotent;
            break;
        case descriptor_pb_js_1.MethodOptions_IdempotencyLevel.NO_SIDE_EFFECTS:
            idempotency = service_type_js_1.MethodIdempotency.NoSideEffects;
            break;
        case descriptor_pb_js_1.MethodOptions_IdempotencyLevel.IDEMPOTENCY_UNKNOWN:
        case undefined:
            idempotency = undefined;
            break;
    }
    const input = cart.messages.get(trimLeadingDot(proto.inputType));
    const output = cart.messages.get(trimLeadingDot(proto.outputType));
    (0, assert_js_1.assert)(input, `invalid MethodDescriptorProto: input_type ${proto.inputType} not found`);
    (0, assert_js_1.assert)(output, `invalid MethodDescriptorProto: output_type ${proto.inputType} not found`);
    const name = proto.name;
    return {
        kind: "rpc",
        proto,
        deprecated: (_c = (_b = proto.options) === null || _b === void 0 ? void 0 : _b.deprecated) !== null && _c !== void 0 ? _c : false,
        parent,
        name,
        methodKind,
        input,
        output,
        idempotency,
        toString() {
            return `rpc ${parent.typeName}.${name}`;
        },
        getComments() {
            const path = [
                ...this.parent.getComments().sourcePath,
                FieldNumber.ServiceDescriptorProto_Method,
                this.parent.proto.method.indexOf(this.proto),
            ];
            return findComments(parent.file.proto.sourceCodeInfo, path);
        },
        getFeatures() {
            var _a;
            return resolveFeatures(parent.getFeatures(), (_a = proto.options) === null || _a === void 0 ? void 0 : _a.features);
        },
    };
}
/**
 * Create a descriptor for a oneof group.
 */
function newOneof(proto, parent, resolveFeatures) {
    (0, assert_js_1.assert)(proto.name, `invalid OneofDescriptorProto: missing name`);
    return {
        kind: "oneof",
        proto,
        deprecated: false,
        parent,
        fields: [],
        name: proto.name,
        toString() {
            return `oneof ${parent.typeName}.${this.name}`;
        },
        getComments() {
            const path = [
                ...this.parent.getComments().sourcePath,
                FieldNumber.DescriptorProto_OneofDecl,
                this.parent.proto.oneofDecl.indexOf(this.proto),
            ];
            return findComments(parent.file.proto.sourceCodeInfo, path);
        },
        getFeatures() {
            var _a;
            return resolveFeatures(parent.getFeatures(), (_a = proto.options) === null || _a === void 0 ? void 0 : _a.features);
        },
    };
}
/**
 * Create a descriptor for a field.
 */
function newField(proto, file, parent, oneof, cart, resolveFeatures) {
    var _a, _b, _c;
    (0, assert_js_1.assert)(proto.name, `invalid FieldDescriptorProto: missing name`);
    (0, assert_js_1.assert)(proto.number, `invalid FieldDescriptorProto: missing number`);
    (0, assert_js_1.assert)(proto.type, `invalid FieldDescriptorProto: missing type`);
    const common = {
        proto,
        deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
        name: proto.name,
        number: proto.number,
        parent,
        oneof,
        optional: isOptionalField(proto, file.syntax),
        packedByDefault: isPackedFieldByDefault(proto, resolveFeatures),
        packed: isPackedField(file, parent, proto, resolveFeatures),
        jsonName: proto.jsonName === (0, names_js_1.fieldJsonName)(proto.name) ? undefined : proto.jsonName,
        scalar: undefined,
        longType: undefined,
        message: undefined,
        enum: undefined,
        mapKey: undefined,
        mapValue: undefined,
        declarationString,
        // toString, getComments, getFeatures are overridden in newExtension
        toString() {
            return `field ${this.parent.typeName}.${this.name}`;
        },
        getComments() {
            const path = [
                ...this.parent.getComments().sourcePath,
                FieldNumber.DescriptorProto_Field,
                this.parent.proto.field.indexOf(this.proto),
            ];
            return findComments(file.proto.sourceCodeInfo, path);
        },
        getFeatures() {
            var _a;
            return resolveFeatures(parent.getFeatures(), (_a = proto.options) === null || _a === void 0 ? void 0 : _a.features);
        },
    };
    const repeated = proto.label === descriptor_pb_js_1.FieldDescriptorProto_Label.REPEATED;
    switch (proto.type) {
        case descriptor_pb_js_1.FieldDescriptorProto_Type.MESSAGE:
        case descriptor_pb_js_1.FieldDescriptorProto_Type.GROUP: {
            (0, assert_js_1.assert)(proto.typeName, `invalid FieldDescriptorProto: missing type_name`);
            const mapEntry = cart.mapEntries.get(trimLeadingDot(proto.typeName));
            if (mapEntry !== undefined) {
                (0, assert_js_1.assert)(repeated, `invalid FieldDescriptorProto: expected map entry to be repeated`);
                return Object.assign(Object.assign(Object.assign({}, common), { kind: "field", fieldKind: "map", repeated: false }), getMapFieldTypes(mapEntry));
            }
            const message = cart.messages.get(trimLeadingDot(proto.typeName));
            (0, assert_js_1.assert)(message !== undefined, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
            return Object.assign(Object.assign({}, common), { kind: "field", fieldKind: "message", repeated,
                message });
        }
        case descriptor_pb_js_1.FieldDescriptorProto_Type.ENUM: {
            (0, assert_js_1.assert)(proto.typeName, `invalid FieldDescriptorProto: missing type_name`);
            const e = cart.enums.get(trimLeadingDot(proto.typeName));
            (0, assert_js_1.assert)(e !== undefined, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
            return Object.assign(Object.assign({}, common), { kind: "field", fieldKind: "enum", getDefaultValue,
                repeated, enum: e });
        }
        default: {
            const scalar = fieldTypeToScalarType[proto.type];
            (0, assert_js_1.assert)(scalar, `invalid FieldDescriptorProto: unknown type ${proto.type}`);
            return Object.assign(Object.assign({}, common), { kind: "field", fieldKind: "scalar", getDefaultValue,
                repeated,
                scalar, longType: ((_c = proto.options) === null || _c === void 0 ? void 0 : _c.jstype) == descriptor_pb_js_1.FieldOptions_JSType.JS_STRING
                    ? scalar_js_1.LongType.STRING
                    : scalar_js_1.LongType.BIGINT });
        }
    }
}
/**
 * Create a descriptor for an extension field.
 */
function newExtension(proto, file, parent, cart, resolveFeatures) {
    (0, assert_js_1.assert)(proto.extendee, `invalid FieldDescriptorProto: missing extendee`);
    const field = newField(proto, file, null, // to safe us many lines of duplicated code, we trick the type system
    undefined, cart, resolveFeatures);
    const extendee = cart.messages.get(trimLeadingDot(proto.extendee));
    (0, assert_js_1.assert)(extendee, `invalid FieldDescriptorProto: extendee ${proto.extendee} not found`);
    return Object.assign(Object.assign({}, field), { kind: "extension", typeName: makeTypeName(proto, parent, file), parent,
        file,
        extendee,
        // Must override toString, getComments, getFeatures from newField, because we
        // call newField with parent undefined.
        toString() {
            return `extension ${this.typeName}`;
        },
        getComments() {
            const path = this.parent
                ? [
                    ...this.parent.getComments().sourcePath,
                    FieldNumber.DescriptorProto_Extension,
                    this.parent.proto.extension.indexOf(proto),
                ]
                : [
                    FieldNumber.FileDescriptorProto_Extension,
                    this.file.proto.extension.indexOf(proto),
                ];
            return findComments(file.proto.sourceCodeInfo, path);
        },
        getFeatures() {
            var _a;
            return resolveFeatures((parent !== null && parent !== void 0 ? parent : file).getFeatures(), (_a = proto.options) === null || _a === void 0 ? void 0 : _a.features);
        } });
}
/**
 * Parse the "syntax" and "edition" fields, stripping test editions.
 */
function parseFileSyntax(syntax, edition) {
    let e;
    let s;
    switch (syntax) {
        case undefined:
        case "proto2":
            s = "proto2";
            e = descriptor_pb_js_1.Edition.EDITION_PROTO2;
            break;
        case "proto3":
            s = "proto3";
            e = descriptor_pb_js_1.Edition.EDITION_PROTO3;
            break;
        case "editions":
            s = "editions";
            switch (edition) {
                case undefined:
                case descriptor_pb_js_1.Edition.EDITION_1_TEST_ONLY:
                case descriptor_pb_js_1.Edition.EDITION_2_TEST_ONLY:
                case descriptor_pb_js_1.Edition.EDITION_99997_TEST_ONLY:
                case descriptor_pb_js_1.Edition.EDITION_99998_TEST_ONLY:
                case descriptor_pb_js_1.Edition.EDITION_99999_TEST_ONLY:
                case descriptor_pb_js_1.Edition.EDITION_UNKNOWN:
                    e = descriptor_pb_js_1.Edition.EDITION_UNKNOWN;
                    break;
                default:
                    e = edition;
                    break;
            }
            break;
        default:
            throw new Error(`invalid FileDescriptorProto: unsupported syntax: ${syntax}`);
    }
    if (syntax === "editions" && edition === descriptor_pb_js_1.Edition.EDITION_UNKNOWN) {
        throw new Error(`invalid FileDescriptorProto: syntax ${syntax} cannot have edition ${String(edition)}`);
    }
    return {
        syntax: s,
        edition: e,
    };
}
/**
 * Resolve dependencies of FileDescriptorProto to DescFile.
 */
function findFileDependencies(proto, cart) {
    return proto.dependency.map((wantName) => {
        const dep = cart.files.find((f) => f.proto.name === wantName);
        (0, assert_js_1.assert)(dep);
        return dep;
    });
}
/**
 * Create a fully qualified name for a protobuf type or extension field.
 *
 * The fully qualified name for messages, enumerations, and services is
 * constructed by concatenating the package name (if present), parent
 * message names (for nested types), and the type name. We omit the leading
 * dot added by protobuf compilers. Examples:
 * - mypackage.MyMessage
 * - mypackage.MyMessage.NestedMessage
 *
 * The fully qualified name for extension fields is constructed by
 * concatenating the package name (if present), parent message names (for
 * extensions declared within a message), and the field name. Examples:
 * - mypackage.extfield
 * - mypackage.MyMessage.extfield
 */
function makeTypeName(proto, parent, file) {
    (0, assert_js_1.assert)(proto.name, `invalid ${proto.getType().typeName}: missing name`);
    let typeName;
    if (parent) {
        typeName = `${parent.typeName}.${proto.name}`;
    }
    else if (file.proto.package !== undefined) {
        typeName = `${file.proto.package}.${proto.name}`;
    }
    else {
        typeName = `${proto.name}`;
    }
    return typeName;
}
/**
 * Remove the leading dot from a fully qualified type name.
 */
function trimLeadingDot(typeName) {
    return typeName.startsWith(".") ? typeName.substring(1) : typeName;
}
function getMapFieldTypes(mapEntry) {
    var _a, _b;
    (0, assert_js_1.assert)((_a = mapEntry.proto.options) === null || _a === void 0 ? void 0 : _a.mapEntry, `invalid DescriptorProto: expected ${mapEntry.toString()} to be a map entry`);
    (0, assert_js_1.assert)(mapEntry.fields.length === 2, `invalid DescriptorProto: map entry ${mapEntry.toString()} has ${mapEntry.fields.length} fields`);
    const keyField = mapEntry.fields.find((f) => f.proto.number === 1);
    (0, assert_js_1.assert)(keyField, `invalid DescriptorProto: map entry ${mapEntry.toString()} is missing key field`);
    const mapKey = keyField.scalar;
    (0, assert_js_1.assert)(mapKey !== undefined &&
        mapKey !== scalar_js_1.ScalarType.BYTES &&
        mapKey !== scalar_js_1.ScalarType.FLOAT &&
        mapKey !== scalar_js_1.ScalarType.DOUBLE, `invalid DescriptorProto: map entry ${mapEntry.toString()} has unexpected key type ${(_b = keyField.proto.type) !== null && _b !== void 0 ? _b : -1}`);
    const valueField = mapEntry.fields.find((f) => f.proto.number === 2);
    (0, assert_js_1.assert)(valueField, `invalid DescriptorProto: map entry ${mapEntry.toString()} is missing value field`);
    switch (valueField.fieldKind) {
        case "scalar":
            return {
                mapKey,
                mapValue: Object.assign(Object.assign({}, valueField), { kind: "scalar" }),
            };
        case "message":
            return {
                mapKey,
                mapValue: Object.assign(Object.assign({}, valueField), { kind: "message" }),
            };
        case "enum":
            return {
                mapKey,
                mapValue: Object.assign(Object.assign({}, valueField), { kind: "enum" }),
            };
        default:
            throw new Error("invalid DescriptorProto: unsupported map entry value field");
    }
}
/**
 * Did the user put the field in a oneof group?
 * This handles proto3 optionals.
 */
function findOneof(proto, allOneofs) {
    var _a;
    const oneofIndex = proto.oneofIndex;
    if (oneofIndex === undefined) {
        return undefined;
    }
    let oneof;
    if (proto.proto3Optional !== true) {
        oneof = allOneofs[oneofIndex];
        (0, assert_js_1.assert)(oneof, `invalid FieldDescriptorProto: oneof #${oneofIndex} for field #${(_a = proto.number) !== null && _a !== void 0 ? _a : -1} not found`);
    }
    return oneof;
}
/**
 * Did the user use the `optional` keyword?
 * This handles proto3 optionals.
 */
function isOptionalField(proto, syntax) {
    switch (syntax) {
        case "proto2":
            return (proto.oneofIndex === undefined &&
                proto.label === descriptor_pb_js_1.FieldDescriptorProto_Label.OPTIONAL);
        case "proto3":
            return proto.proto3Optional === true;
        case "editions":
            return false;
    }
}
/**
 * Is this field packed by default? Only valid for repeated enum fields, and
 * for repeated scalar fields except BYTES and STRING.
 *
 * In proto3 syntax, fields are packed by default. In proto2 syntax, fields
 * are unpacked by default. With editions, the default is whatever the edition
 * specifies as a default. In edition 2023, fields are packed by default.
 */
function isPackedFieldByDefault(proto, resolveFeatures) {
    const { repeatedFieldEncoding } = resolveFeatures();
    if (repeatedFieldEncoding != descriptor_pb_js_1.FeatureSet_RepeatedFieldEncoding.PACKED) {
        return false;
    }
    // From the proto3 language guide:
    // > In proto3, repeated fields of scalar numeric types are packed by default.
    // This information is incomplete - according to the conformance tests, BOOL
    // and ENUM are packed by default as well. This means only STRING and BYTES
    // are not packed by default, which makes sense because they are length-delimited.
    switch (proto.type) {
        case descriptor_pb_js_1.FieldDescriptorProto_Type.STRING:
        case descriptor_pb_js_1.FieldDescriptorProto_Type.BYTES:
        case descriptor_pb_js_1.FieldDescriptorProto_Type.GROUP:
        case descriptor_pb_js_1.FieldDescriptorProto_Type.MESSAGE:
            return false;
        default:
            return true;
    }
}
/**
 * Pack this repeated field?
 *
 * Respects field type, proto2/proto3 defaults and the `packed` option, or
 * edition defaults and the edition features.repeated_field_encoding options.
 */
function isPackedField(file, parent, proto, resolveFeatures) {
    var _a, _b, _c, _d, _e, _f;
    switch (proto.type) {
        case descriptor_pb_js_1.FieldDescriptorProto_Type.STRING:
        case descriptor_pb_js_1.FieldDescriptorProto_Type.BYTES:
        case descriptor_pb_js_1.FieldDescriptorProto_Type.GROUP:
        case descriptor_pb_js_1.FieldDescriptorProto_Type.MESSAGE:
            // length-delimited types cannot be packed
            return false;
        default:
            switch (file.edition) {
                case descriptor_pb_js_1.Edition.EDITION_PROTO2:
                    return (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.packed) !== null && _b !== void 0 ? _b : false;
                case descriptor_pb_js_1.Edition.EDITION_PROTO3:
                    return (_d = (_c = proto.options) === null || _c === void 0 ? void 0 : _c.packed) !== null && _d !== void 0 ? _d : true;
                default: {
                    const { repeatedFieldEncoding } = resolveFeatures((_e = parent === null || parent === void 0 ? void 0 : parent.getFeatures()) !== null && _e !== void 0 ? _e : file.getFeatures(), (_f = proto.options) === null || _f === void 0 ? void 0 : _f.features);
                    return (repeatedFieldEncoding == descriptor_pb_js_1.FeatureSet_RepeatedFieldEncoding.PACKED);
                }
            }
    }
}
/**
 * Map from a compiler-generated field type to our ScalarType, which is a
 * subset of field types declared by protobuf enum google.protobuf.FieldDescriptorProto.
 */
const fieldTypeToScalarType = {
    [descriptor_pb_js_1.FieldDescriptorProto_Type.DOUBLE]: scalar_js_1.ScalarType.DOUBLE,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.FLOAT]: scalar_js_1.ScalarType.FLOAT,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.INT64]: scalar_js_1.ScalarType.INT64,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.UINT64]: scalar_js_1.ScalarType.UINT64,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.INT32]: scalar_js_1.ScalarType.INT32,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.FIXED64]: scalar_js_1.ScalarType.FIXED64,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.FIXED32]: scalar_js_1.ScalarType.FIXED32,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.BOOL]: scalar_js_1.ScalarType.BOOL,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.STRING]: scalar_js_1.ScalarType.STRING,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.GROUP]: undefined,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.MESSAGE]: undefined,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.BYTES]: scalar_js_1.ScalarType.BYTES,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.UINT32]: scalar_js_1.ScalarType.UINT32,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.ENUM]: undefined,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.SFIXED32]: scalar_js_1.ScalarType.SFIXED32,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.SFIXED64]: scalar_js_1.ScalarType.SFIXED64,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.SINT32]: scalar_js_1.ScalarType.SINT32,
    [descriptor_pb_js_1.FieldDescriptorProto_Type.SINT64]: scalar_js_1.ScalarType.SINT64,
};
/**
 * Find comments.
 */
function findComments(sourceCodeInfo, sourcePath) {
    if (!sourceCodeInfo) {
        return {
            leadingDetached: [],
            sourcePath,
        };
    }
    for (const location of sourceCodeInfo.location) {
        if (location.path.length !== sourcePath.length) {
            continue;
        }
        if (location.path.some((value, index) => sourcePath[index] !== value)) {
            continue;
        }
        return {
            leadingDetached: location.leadingDetachedComments,
            leading: location.leadingComments,
            trailing: location.trailingComments,
            sourcePath,
        };
    }
    return {
        leadingDetached: [],
        sourcePath,
    };
}
/**
 * The following field numbers are used to find comments in
 * google.protobuf.SourceCodeInfo.
 */
var FieldNumber;
(function (FieldNumber) {
    FieldNumber[FieldNumber["FileDescriptorProto_Package"] = 2] = "FileDescriptorProto_Package";
    FieldNumber[FieldNumber["FileDescriptorProto_MessageType"] = 4] = "FileDescriptorProto_MessageType";
    FieldNumber[FieldNumber["FileDescriptorProto_EnumType"] = 5] = "FileDescriptorProto_EnumType";
    FieldNumber[FieldNumber["FileDescriptorProto_Service"] = 6] = "FileDescriptorProto_Service";
    FieldNumber[FieldNumber["FileDescriptorProto_Extension"] = 7] = "FileDescriptorProto_Extension";
    FieldNumber[FieldNumber["FileDescriptorProto_Syntax"] = 12] = "FileDescriptorProto_Syntax";
    FieldNumber[FieldNumber["DescriptorProto_Field"] = 2] = "DescriptorProto_Field";
    FieldNumber[FieldNumber["DescriptorProto_NestedType"] = 3] = "DescriptorProto_NestedType";
    FieldNumber[FieldNumber["DescriptorProto_EnumType"] = 4] = "DescriptorProto_EnumType";
    FieldNumber[FieldNumber["DescriptorProto_Extension"] = 6] = "DescriptorProto_Extension";
    FieldNumber[FieldNumber["DescriptorProto_OneofDecl"] = 8] = "DescriptorProto_OneofDecl";
    FieldNumber[FieldNumber["EnumDescriptorProto_Value"] = 2] = "EnumDescriptorProto_Value";
    FieldNumber[FieldNumber["ServiceDescriptorProto_Method"] = 2] = "ServiceDescriptorProto_Method";
})(FieldNumber || (FieldNumber = {}));
/**
 * Return a string that matches the definition of a field in the protobuf
 * source. Does not take custom options into account.
 */
function declarationString() {
    var _a, _b, _c;
    const parts = [];
    if (this.repeated) {
        parts.push("repeated");
    }
    if (this.optional) {
        parts.push("optional");
    }
    const file = this.kind === "extension" ? this.file : this.parent.file;
    if (file.syntax == "proto2" &&
        this.proto.label === descriptor_pb_js_1.FieldDescriptorProto_Label.REQUIRED) {
        parts.push("required");
    }
    let type;
    switch (this.fieldKind) {
        case "scalar":
            type = scalar_js_1.ScalarType[this.scalar].toLowerCase();
            break;
        case "enum":
            type = this.enum.typeName;
            break;
        case "message":
            type = this.message.typeName;
            break;
        case "map": {
            const k = scalar_js_1.ScalarType[this.mapKey].toLowerCase();
            let v;
            switch (this.mapValue.kind) {
                case "scalar":
                    v = scalar_js_1.ScalarType[this.mapValue.scalar].toLowerCase();
                    break;
                case "enum":
                    v = this.mapValue.enum.typeName;
                    break;
                case "message":
                    v = this.mapValue.message.typeName;
                    break;
            }
            type = `map<${k}, ${v}>`;
            break;
        }
    }
    parts.push(`${type} ${this.name} = ${this.number}`);
    const options = [];
    if (((_a = this.proto.options) === null || _a === void 0 ? void 0 : _a.packed) !== undefined) {
        options.push(`packed = ${this.proto.options.packed.toString()}`);
    }
    let defaultValue = this.proto.defaultValue;
    if (defaultValue !== undefined) {
        if (this.proto.type == descriptor_pb_js_1.FieldDescriptorProto_Type.BYTES ||
            this.proto.type == descriptor_pb_js_1.FieldDescriptorProto_Type.STRING) {
            defaultValue = '"' + defaultValue.replace('"', '\\"') + '"';
        }
        options.push(`default = ${defaultValue}`);
    }
    if (this.jsonName !== undefined) {
        options.push(`json_name = "${this.jsonName}"`);
    }
    if (((_b = this.proto.options) === null || _b === void 0 ? void 0 : _b.jstype) !== undefined) {
        options.push(`jstype = ${descriptor_pb_js_1.FieldOptions_JSType[this.proto.options.jstype]}`);
    }
    if (((_c = this.proto.options) === null || _c === void 0 ? void 0 : _c.deprecated) === true) {
        options.push(`deprecated = true`);
    }
    if (options.length > 0) {
        parts.push("[" + options.join(", ") + "]");
    }
    return parts.join(" ");
}
/**
 * Parses a text-encoded default value (proto2) of a scalar or enum field.
 */
function getDefaultValue() {
    const d = this.proto.defaultValue;
    if (d === undefined) {
        return undefined;
    }
    switch (this.fieldKind) {
        case "enum":
            return (0, text_format_js_1.parseTextFormatEnumValue)(this.enum, d);
        case "scalar":
            return (0, text_format_js_1.parseTextFormatScalarValue)(this.scalar, d);
        default:
            return undefined;
    }
}


/***/ }),
/* 42 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GeneratedCodeInfo_Annotation_Semantic = exports.GeneratedCodeInfo_Annotation = exports.GeneratedCodeInfo = exports.SourceCodeInfo_Location = exports.SourceCodeInfo = exports.FeatureSetDefaults_FeatureSetEditionDefault = exports.FeatureSetDefaults = exports.FeatureSet_JsonFormat = exports.FeatureSet_MessageEncoding = exports.FeatureSet_Utf8Validation = exports.FeatureSet_RepeatedFieldEncoding = exports.FeatureSet_EnumType = exports.FeatureSet_FieldPresence = exports.FeatureSet = exports.UninterpretedOption_NamePart = exports.UninterpretedOption = exports.MethodOptions_IdempotencyLevel = exports.MethodOptions = exports.ServiceOptions = exports.EnumValueOptions = exports.EnumOptions = exports.OneofOptions = exports.FieldOptions_FeatureSupport = exports.FieldOptions_EditionDefault = exports.FieldOptions_OptionTargetType = exports.FieldOptions_OptionRetention = exports.FieldOptions_JSType = exports.FieldOptions_CType = exports.FieldOptions = exports.MessageOptions = exports.FileOptions_OptimizeMode = exports.FileOptions = exports.MethodDescriptorProto = exports.ServiceDescriptorProto = exports.EnumValueDescriptorProto = exports.EnumDescriptorProto_EnumReservedRange = exports.EnumDescriptorProto = exports.OneofDescriptorProto = exports.FieldDescriptorProto_Label = exports.FieldDescriptorProto_Type = exports.FieldDescriptorProto = exports.ExtensionRangeOptions_Declaration = exports.ExtensionRangeOptions_VerificationState = exports.ExtensionRangeOptions = exports.DescriptorProto_ReservedRange = exports.DescriptorProto_ExtensionRange = exports.DescriptorProto = exports.FileDescriptorProto = exports.FileDescriptorSet = exports.Edition = void 0;
// Author: kenton@google.com (Kenton Varda)
//  Based on original Protocol Buffers design by
//  Sanjay Ghemawat, Jeff Dean, and others.
//
// The messages in this file describe the definitions found in .proto files.
// A valid .proto file can be translated directly to a FileDescriptorProto
// without any other information (e.g. without reading its imports).
// @generated by protoc-gen-es v1.10.1 with parameter "bootstrap_wkt=true,ts_nocheck=false,target=ts"
// @generated from file google/protobuf/descriptor.proto (package google.protobuf, syntax proto2)
/* eslint-disable */
const proto2_js_1 = __webpack_require__(35);
const message_js_1 = __webpack_require__(16);
/**
 * The full set of known editions.
 *
 * @generated from enum google.protobuf.Edition
 */
var Edition;
(function (Edition) {
    /**
     * A placeholder for an unknown edition value.
     *
     * @generated from enum value: EDITION_UNKNOWN = 0;
     */
    Edition[Edition["EDITION_UNKNOWN"] = 0] = "EDITION_UNKNOWN";
    /**
     * A placeholder edition for specifying default behaviors *before* a feature
     * was first introduced.  This is effectively an "infinite past".
     *
     * @generated from enum value: EDITION_LEGACY = 900;
     */
    Edition[Edition["EDITION_LEGACY"] = 900] = "EDITION_LEGACY";
    /**
     * Legacy syntax "editions".  These pre-date editions, but behave much like
     * distinct editions.  These can't be used to specify the edition of proto
     * files, but feature definitions must supply proto2/proto3 defaults for
     * backwards compatibility.
     *
     * @generated from enum value: EDITION_PROTO2 = 998;
     */
    Edition[Edition["EDITION_PROTO2"] = 998] = "EDITION_PROTO2";
    /**
     * @generated from enum value: EDITION_PROTO3 = 999;
     */
    Edition[Edition["EDITION_PROTO3"] = 999] = "EDITION_PROTO3";
    /**
     * Editions that have been released.  The specific values are arbitrary and
     * should not be depended on, but they will always be time-ordered for easy
     * comparison.
     *
     * @generated from enum value: EDITION_2023 = 1000;
     */
    Edition[Edition["EDITION_2023"] = 1000] = "EDITION_2023";
    /**
     * @generated from enum value: EDITION_2024 = 1001;
     */
    Edition[Edition["EDITION_2024"] = 1001] = "EDITION_2024";
    /**
     * Placeholder editions for testing feature resolution.  These should not be
     * used or relyed on outside of tests.
     *
     * @generated from enum value: EDITION_1_TEST_ONLY = 1;
     */
    Edition[Edition["EDITION_1_TEST_ONLY"] = 1] = "EDITION_1_TEST_ONLY";
    /**
     * @generated from enum value: EDITION_2_TEST_ONLY = 2;
     */
    Edition[Edition["EDITION_2_TEST_ONLY"] = 2] = "EDITION_2_TEST_ONLY";
    /**
     * @generated from enum value: EDITION_99997_TEST_ONLY = 99997;
     */
    Edition[Edition["EDITION_99997_TEST_ONLY"] = 99997] = "EDITION_99997_TEST_ONLY";
    /**
     * @generated from enum value: EDITION_99998_TEST_ONLY = 99998;
     */
    Edition[Edition["EDITION_99998_TEST_ONLY"] = 99998] = "EDITION_99998_TEST_ONLY";
    /**
     * @generated from enum value: EDITION_99999_TEST_ONLY = 99999;
     */
    Edition[Edition["EDITION_99999_TEST_ONLY"] = 99999] = "EDITION_99999_TEST_ONLY";
    /**
     * Placeholder for specifying unbounded edition support.  This should only
     * ever be used by plugins that can expect to never require any changes to
     * support a new edition.
     *
     * @generated from enum value: EDITION_MAX = 2147483647;
     */
    Edition[Edition["EDITION_MAX"] = 2147483647] = "EDITION_MAX";
})(Edition || (exports.Edition = Edition = {}));
// Retrieve enum metadata with: proto2.getEnumType(Edition)
proto2_js_1.proto2.util.setEnumType(Edition, "google.protobuf.Edition", [
    { no: 0, name: "EDITION_UNKNOWN" },
    { no: 900, name: "EDITION_LEGACY" },
    { no: 998, name: "EDITION_PROTO2" },
    { no: 999, name: "EDITION_PROTO3" },
    { no: 1000, name: "EDITION_2023" },
    { no: 1001, name: "EDITION_2024" },
    { no: 1, name: "EDITION_1_TEST_ONLY" },
    { no: 2, name: "EDITION_2_TEST_ONLY" },
    { no: 99997, name: "EDITION_99997_TEST_ONLY" },
    { no: 99998, name: "EDITION_99998_TEST_ONLY" },
    { no: 99999, name: "EDITION_99999_TEST_ONLY" },
    { no: 2147483647, name: "EDITION_MAX" },
]);
/**
 * The protocol compiler can output a FileDescriptorSet containing the .proto
 * files it parses.
 *
 * @generated from message google.protobuf.FileDescriptorSet
 */
class FileDescriptorSet extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * @generated from field: repeated google.protobuf.FileDescriptorProto file = 1;
         */
        this.file = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new FileDescriptorSet().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FileDescriptorSet().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FileDescriptorSet().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(FileDescriptorSet, a, b);
    }
}
exports.FileDescriptorSet = FileDescriptorSet;
FileDescriptorSet.runtime = proto2_js_1.proto2;
FileDescriptorSet.typeName = "google.protobuf.FileDescriptorSet";
FileDescriptorSet.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "file", kind: "message", T: FileDescriptorProto, repeated: true },
]);
/**
 * Describes a complete .proto file.
 *
 * @generated from message google.protobuf.FileDescriptorProto
 */
class FileDescriptorProto extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * Names of files imported by this file.
         *
         * @generated from field: repeated string dependency = 3;
         */
        this.dependency = [];
        /**
         * Indexes of the public imported files in the dependency list above.
         *
         * @generated from field: repeated int32 public_dependency = 10;
         */
        this.publicDependency = [];
        /**
         * Indexes of the weak imported files in the dependency list.
         * For Google-internal migration only. Do not use.
         *
         * @generated from field: repeated int32 weak_dependency = 11;
         */
        this.weakDependency = [];
        /**
         * All top-level definitions in this file.
         *
         * @generated from field: repeated google.protobuf.DescriptorProto message_type = 4;
         */
        this.messageType = [];
        /**
         * @generated from field: repeated google.protobuf.EnumDescriptorProto enum_type = 5;
         */
        this.enumType = [];
        /**
         * @generated from field: repeated google.protobuf.ServiceDescriptorProto service = 6;
         */
        this.service = [];
        /**
         * @generated from field: repeated google.protobuf.FieldDescriptorProto extension = 7;
         */
        this.extension = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new FileDescriptorProto().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FileDescriptorProto().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FileDescriptorProto().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(FileDescriptorProto, a, b);
    }
}
exports.FileDescriptorProto = FileDescriptorProto;
FileDescriptorProto.runtime = proto2_js_1.proto2;
FileDescriptorProto.typeName = "google.protobuf.FileDescriptorProto";
FileDescriptorProto.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 2, name: "package", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 3, name: "dependency", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
    { no: 10, name: "public_dependency", kind: "scalar", T: 5 /* ScalarType.INT32 */, repeated: true },
    { no: 11, name: "weak_dependency", kind: "scalar", T: 5 /* ScalarType.INT32 */, repeated: true },
    { no: 4, name: "message_type", kind: "message", T: DescriptorProto, repeated: true },
    { no: 5, name: "enum_type", kind: "message", T: EnumDescriptorProto, repeated: true },
    { no: 6, name: "service", kind: "message", T: ServiceDescriptorProto, repeated: true },
    { no: 7, name: "extension", kind: "message", T: FieldDescriptorProto, repeated: true },
    { no: 8, name: "options", kind: "message", T: FileOptions, opt: true },
    { no: 9, name: "source_code_info", kind: "message", T: SourceCodeInfo, opt: true },
    { no: 12, name: "syntax", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 14, name: "edition", kind: "enum", T: proto2_js_1.proto2.getEnumType(Edition), opt: true },
]);
/**
 * Describes a message type.
 *
 * @generated from message google.protobuf.DescriptorProto
 */
class DescriptorProto extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * @generated from field: repeated google.protobuf.FieldDescriptorProto field = 2;
         */
        this.field = [];
        /**
         * @generated from field: repeated google.protobuf.FieldDescriptorProto extension = 6;
         */
        this.extension = [];
        /**
         * @generated from field: repeated google.protobuf.DescriptorProto nested_type = 3;
         */
        this.nestedType = [];
        /**
         * @generated from field: repeated google.protobuf.EnumDescriptorProto enum_type = 4;
         */
        this.enumType = [];
        /**
         * @generated from field: repeated google.protobuf.DescriptorProto.ExtensionRange extension_range = 5;
         */
        this.extensionRange = [];
        /**
         * @generated from field: repeated google.protobuf.OneofDescriptorProto oneof_decl = 8;
         */
        this.oneofDecl = [];
        /**
         * @generated from field: repeated google.protobuf.DescriptorProto.ReservedRange reserved_range = 9;
         */
        this.reservedRange = [];
        /**
         * Reserved field names, which may not be used by fields in the same message.
         * A given name may only be reserved once.
         *
         * @generated from field: repeated string reserved_name = 10;
         */
        this.reservedName = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new DescriptorProto().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new DescriptorProto().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new DescriptorProto().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(DescriptorProto, a, b);
    }
}
exports.DescriptorProto = DescriptorProto;
DescriptorProto.runtime = proto2_js_1.proto2;
DescriptorProto.typeName = "google.protobuf.DescriptorProto";
DescriptorProto.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 2, name: "field", kind: "message", T: FieldDescriptorProto, repeated: true },
    { no: 6, name: "extension", kind: "message", T: FieldDescriptorProto, repeated: true },
    { no: 3, name: "nested_type", kind: "message", T: DescriptorProto, repeated: true },
    { no: 4, name: "enum_type", kind: "message", T: EnumDescriptorProto, repeated: true },
    { no: 5, name: "extension_range", kind: "message", T: DescriptorProto_ExtensionRange, repeated: true },
    { no: 8, name: "oneof_decl", kind: "message", T: OneofDescriptorProto, repeated: true },
    { no: 7, name: "options", kind: "message", T: MessageOptions, opt: true },
    { no: 9, name: "reserved_range", kind: "message", T: DescriptorProto_ReservedRange, repeated: true },
    { no: 10, name: "reserved_name", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
]);
/**
 * @generated from message google.protobuf.DescriptorProto.ExtensionRange
 */
class DescriptorProto_ExtensionRange extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new DescriptorProto_ExtensionRange().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new DescriptorProto_ExtensionRange().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new DescriptorProto_ExtensionRange().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(DescriptorProto_ExtensionRange, a, b);
    }
}
exports.DescriptorProto_ExtensionRange = DescriptorProto_ExtensionRange;
DescriptorProto_ExtensionRange.runtime = proto2_js_1.proto2;
DescriptorProto_ExtensionRange.typeName = "google.protobuf.DescriptorProto.ExtensionRange";
DescriptorProto_ExtensionRange.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "start", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 2, name: "end", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 3, name: "options", kind: "message", T: ExtensionRangeOptions, opt: true },
]);
/**
 * Range of reserved tag numbers. Reserved tag numbers may not be used by
 * fields or extension ranges in the same message. Reserved ranges may
 * not overlap.
 *
 * @generated from message google.protobuf.DescriptorProto.ReservedRange
 */
class DescriptorProto_ReservedRange extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new DescriptorProto_ReservedRange().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new DescriptorProto_ReservedRange().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new DescriptorProto_ReservedRange().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(DescriptorProto_ReservedRange, a, b);
    }
}
exports.DescriptorProto_ReservedRange = DescriptorProto_ReservedRange;
DescriptorProto_ReservedRange.runtime = proto2_js_1.proto2;
DescriptorProto_ReservedRange.typeName = "google.protobuf.DescriptorProto.ReservedRange";
DescriptorProto_ReservedRange.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "start", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 2, name: "end", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
]);
/**
 * @generated from message google.protobuf.ExtensionRangeOptions
 */
class ExtensionRangeOptions extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The parser stores options it doesn't recognize here. See above.
         *
         * @generated from field: repeated google.protobuf.UninterpretedOption uninterpreted_option = 999;
         */
        this.uninterpretedOption = [];
        /**
         * For external users: DO NOT USE. We are in the process of open sourcing
         * extension declaration and executing internal cleanups before it can be
         * used externally.
         *
         * @generated from field: repeated google.protobuf.ExtensionRangeOptions.Declaration declaration = 2;
         */
        this.declaration = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new ExtensionRangeOptions().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new ExtensionRangeOptions().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new ExtensionRangeOptions().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(ExtensionRangeOptions, a, b);
    }
}
exports.ExtensionRangeOptions = ExtensionRangeOptions;
ExtensionRangeOptions.runtime = proto2_js_1.proto2;
ExtensionRangeOptions.typeName = "google.protobuf.ExtensionRangeOptions";
ExtensionRangeOptions.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 999, name: "uninterpreted_option", kind: "message", T: UninterpretedOption, repeated: true },
    { no: 2, name: "declaration", kind: "message", T: ExtensionRangeOptions_Declaration, repeated: true },
    { no: 50, name: "features", kind: "message", T: FeatureSet, opt: true },
    { no: 3, name: "verification", kind: "enum", T: proto2_js_1.proto2.getEnumType(ExtensionRangeOptions_VerificationState), opt: true, default: ExtensionRangeOptions_VerificationState.UNVERIFIED },
]);
/**
 * The verification state of the extension range.
 *
 * @generated from enum google.protobuf.ExtensionRangeOptions.VerificationState
 */
var ExtensionRangeOptions_VerificationState;
(function (ExtensionRangeOptions_VerificationState) {
    /**
     * All the extensions of the range must be declared.
     *
     * @generated from enum value: DECLARATION = 0;
     */
    ExtensionRangeOptions_VerificationState[ExtensionRangeOptions_VerificationState["DECLARATION"] = 0] = "DECLARATION";
    /**
     * @generated from enum value: UNVERIFIED = 1;
     */
    ExtensionRangeOptions_VerificationState[ExtensionRangeOptions_VerificationState["UNVERIFIED"] = 1] = "UNVERIFIED";
})(ExtensionRangeOptions_VerificationState || (exports.ExtensionRangeOptions_VerificationState = ExtensionRangeOptions_VerificationState = {}));
// Retrieve enum metadata with: proto2.getEnumType(ExtensionRangeOptions_VerificationState)
proto2_js_1.proto2.util.setEnumType(ExtensionRangeOptions_VerificationState, "google.protobuf.ExtensionRangeOptions.VerificationState", [
    { no: 0, name: "DECLARATION" },
    { no: 1, name: "UNVERIFIED" },
]);
/**
 * @generated from message google.protobuf.ExtensionRangeOptions.Declaration
 */
class ExtensionRangeOptions_Declaration extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new ExtensionRangeOptions_Declaration().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new ExtensionRangeOptions_Declaration().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new ExtensionRangeOptions_Declaration().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(ExtensionRangeOptions_Declaration, a, b);
    }
}
exports.ExtensionRangeOptions_Declaration = ExtensionRangeOptions_Declaration;
ExtensionRangeOptions_Declaration.runtime = proto2_js_1.proto2;
ExtensionRangeOptions_Declaration.typeName = "google.protobuf.ExtensionRangeOptions.Declaration";
ExtensionRangeOptions_Declaration.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "number", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 2, name: "full_name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 3, name: "type", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 5, name: "reserved", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true },
    { no: 6, name: "repeated", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true },
]);
/**
 * Describes a field within a message.
 *
 * @generated from message google.protobuf.FieldDescriptorProto
 */
class FieldDescriptorProto extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new FieldDescriptorProto().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FieldDescriptorProto().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FieldDescriptorProto().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(FieldDescriptorProto, a, b);
    }
}
exports.FieldDescriptorProto = FieldDescriptorProto;
FieldDescriptorProto.runtime = proto2_js_1.proto2;
FieldDescriptorProto.typeName = "google.protobuf.FieldDescriptorProto";
FieldDescriptorProto.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 3, name: "number", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 4, name: "label", kind: "enum", T: proto2_js_1.proto2.getEnumType(FieldDescriptorProto_Label), opt: true },
    { no: 5, name: "type", kind: "enum", T: proto2_js_1.proto2.getEnumType(FieldDescriptorProto_Type), opt: true },
    { no: 6, name: "type_name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 2, name: "extendee", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 7, name: "default_value", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 9, name: "oneof_index", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 10, name: "json_name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 8, name: "options", kind: "message", T: FieldOptions, opt: true },
    { no: 17, name: "proto3_optional", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true },
]);
/**
 * @generated from enum google.protobuf.FieldDescriptorProto.Type
 */
var FieldDescriptorProto_Type;
(function (FieldDescriptorProto_Type) {
    /**
     * 0 is reserved for errors.
     * Order is weird for historical reasons.
     *
     * @generated from enum value: TYPE_DOUBLE = 1;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["DOUBLE"] = 1] = "DOUBLE";
    /**
     * @generated from enum value: TYPE_FLOAT = 2;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["FLOAT"] = 2] = "FLOAT";
    /**
     * Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT64 if
     * negative values are likely.
     *
     * @generated from enum value: TYPE_INT64 = 3;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["INT64"] = 3] = "INT64";
    /**
     * @generated from enum value: TYPE_UINT64 = 4;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["UINT64"] = 4] = "UINT64";
    /**
     * Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT32 if
     * negative values are likely.
     *
     * @generated from enum value: TYPE_INT32 = 5;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["INT32"] = 5] = "INT32";
    /**
     * @generated from enum value: TYPE_FIXED64 = 6;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["FIXED64"] = 6] = "FIXED64";
    /**
     * @generated from enum value: TYPE_FIXED32 = 7;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["FIXED32"] = 7] = "FIXED32";
    /**
     * @generated from enum value: TYPE_BOOL = 8;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["BOOL"] = 8] = "BOOL";
    /**
     * @generated from enum value: TYPE_STRING = 9;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["STRING"] = 9] = "STRING";
    /**
     * Tag-delimited aggregate.
     * Group type is deprecated and not supported after google.protobuf. However, Proto3
     * implementations should still be able to parse the group wire format and
     * treat group fields as unknown fields.  In Editions, the group wire format
     * can be enabled via the `message_encoding` feature.
     *
     * @generated from enum value: TYPE_GROUP = 10;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["GROUP"] = 10] = "GROUP";
    /**
     * Length-delimited aggregate.
     *
     * @generated from enum value: TYPE_MESSAGE = 11;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["MESSAGE"] = 11] = "MESSAGE";
    /**
     * New in version 2.
     *
     * @generated from enum value: TYPE_BYTES = 12;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["BYTES"] = 12] = "BYTES";
    /**
     * @generated from enum value: TYPE_UINT32 = 13;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["UINT32"] = 13] = "UINT32";
    /**
     * @generated from enum value: TYPE_ENUM = 14;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["ENUM"] = 14] = "ENUM";
    /**
     * @generated from enum value: TYPE_SFIXED32 = 15;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["SFIXED32"] = 15] = "SFIXED32";
    /**
     * @generated from enum value: TYPE_SFIXED64 = 16;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["SFIXED64"] = 16] = "SFIXED64";
    /**
     * Uses ZigZag encoding.
     *
     * @generated from enum value: TYPE_SINT32 = 17;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["SINT32"] = 17] = "SINT32";
    /**
     * Uses ZigZag encoding.
     *
     * @generated from enum value: TYPE_SINT64 = 18;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["SINT64"] = 18] = "SINT64";
})(FieldDescriptorProto_Type || (exports.FieldDescriptorProto_Type = FieldDescriptorProto_Type = {}));
// Retrieve enum metadata with: proto2.getEnumType(FieldDescriptorProto_Type)
proto2_js_1.proto2.util.setEnumType(FieldDescriptorProto_Type, "google.protobuf.FieldDescriptorProto.Type", [
    { no: 1, name: "TYPE_DOUBLE" },
    { no: 2, name: "TYPE_FLOAT" },
    { no: 3, name: "TYPE_INT64" },
    { no: 4, name: "TYPE_UINT64" },
    { no: 5, name: "TYPE_INT32" },
    { no: 6, name: "TYPE_FIXED64" },
    { no: 7, name: "TYPE_FIXED32" },
    { no: 8, name: "TYPE_BOOL" },
    { no: 9, name: "TYPE_STRING" },
    { no: 10, name: "TYPE_GROUP" },
    { no: 11, name: "TYPE_MESSAGE" },
    { no: 12, name: "TYPE_BYTES" },
    { no: 13, name: "TYPE_UINT32" },
    { no: 14, name: "TYPE_ENUM" },
    { no: 15, name: "TYPE_SFIXED32" },
    { no: 16, name: "TYPE_SFIXED64" },
    { no: 17, name: "TYPE_SINT32" },
    { no: 18, name: "TYPE_SINT64" },
]);
/**
 * @generated from enum google.protobuf.FieldDescriptorProto.Label
 */
var FieldDescriptorProto_Label;
(function (FieldDescriptorProto_Label) {
    /**
     * 0 is reserved for errors
     *
     * @generated from enum value: LABEL_OPTIONAL = 1;
     */
    FieldDescriptorProto_Label[FieldDescriptorProto_Label["OPTIONAL"] = 1] = "OPTIONAL";
    /**
     * @generated from enum value: LABEL_REPEATED = 3;
     */
    FieldDescriptorProto_Label[FieldDescriptorProto_Label["REPEATED"] = 3] = "REPEATED";
    /**
     * The required label is only allowed in google.protobuf.  In proto3 and Editions
     * it's explicitly prohibited.  In Editions, the `field_presence` feature
     * can be used to get this behavior.
     *
     * @generated from enum value: LABEL_REQUIRED = 2;
     */
    FieldDescriptorProto_Label[FieldDescriptorProto_Label["REQUIRED"] = 2] = "REQUIRED";
})(FieldDescriptorProto_Label || (exports.FieldDescriptorProto_Label = FieldDescriptorProto_Label = {}));
// Retrieve enum metadata with: proto2.getEnumType(FieldDescriptorProto_Label)
proto2_js_1.proto2.util.setEnumType(FieldDescriptorProto_Label, "google.protobuf.FieldDescriptorProto.Label", [
    { no: 1, name: "LABEL_OPTIONAL" },
    { no: 3, name: "LABEL_REPEATED" },
    { no: 2, name: "LABEL_REQUIRED" },
]);
/**
 * Describes a oneof.
 *
 * @generated from message google.protobuf.OneofDescriptorProto
 */
class OneofDescriptorProto extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new OneofDescriptorProto().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new OneofDescriptorProto().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new OneofDescriptorProto().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(OneofDescriptorProto, a, b);
    }
}
exports.OneofDescriptorProto = OneofDescriptorProto;
OneofDescriptorProto.runtime = proto2_js_1.proto2;
OneofDescriptorProto.typeName = "google.protobuf.OneofDescriptorProto";
OneofDescriptorProto.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 2, name: "options", kind: "message", T: OneofOptions, opt: true },
]);
/**
 * Describes an enum type.
 *
 * @generated from message google.protobuf.EnumDescriptorProto
 */
class EnumDescriptorProto extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * @generated from field: repeated google.protobuf.EnumValueDescriptorProto value = 2;
         */
        this.value = [];
        /**
         * Range of reserved numeric values. Reserved numeric values may not be used
         * by enum values in the same enum declaration. Reserved ranges may not
         * overlap.
         *
         * @generated from field: repeated google.protobuf.EnumDescriptorProto.EnumReservedRange reserved_range = 4;
         */
        this.reservedRange = [];
        /**
         * Reserved enum value names, which may not be reused. A given name may only
         * be reserved once.
         *
         * @generated from field: repeated string reserved_name = 5;
         */
        this.reservedName = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new EnumDescriptorProto().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new EnumDescriptorProto().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new EnumDescriptorProto().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(EnumDescriptorProto, a, b);
    }
}
exports.EnumDescriptorProto = EnumDescriptorProto;
EnumDescriptorProto.runtime = proto2_js_1.proto2;
EnumDescriptorProto.typeName = "google.protobuf.EnumDescriptorProto";
EnumDescriptorProto.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 2, name: "value", kind: "message", T: EnumValueDescriptorProto, repeated: true },
    { no: 3, name: "options", kind: "message", T: EnumOptions, opt: true },
    { no: 4, name: "reserved_range", kind: "message", T: EnumDescriptorProto_EnumReservedRange, repeated: true },
    { no: 5, name: "reserved_name", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
]);
/**
 * Range of reserved numeric values. Reserved values may not be used by
 * entries in the same enum. Reserved ranges may not overlap.
 *
 * Note that this is distinct from DescriptorProto.ReservedRange in that it
 * is inclusive such that it can appropriately represent the entire int32
 * domain.
 *
 * @generated from message google.protobuf.EnumDescriptorProto.EnumReservedRange
 */
class EnumDescriptorProto_EnumReservedRange extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new EnumDescriptorProto_EnumReservedRange().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new EnumDescriptorProto_EnumReservedRange().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new EnumDescriptorProto_EnumReservedRange().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(EnumDescriptorProto_EnumReservedRange, a, b);
    }
}
exports.EnumDescriptorProto_EnumReservedRange = EnumDescriptorProto_EnumReservedRange;
EnumDescriptorProto_EnumReservedRange.runtime = proto2_js_1.proto2;
EnumDescriptorProto_EnumReservedRange.typeName = "google.protobuf.EnumDescriptorProto.EnumReservedRange";
EnumDescriptorProto_EnumReservedRange.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "start", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 2, name: "end", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
]);
/**
 * Describes a value within an enum.
 *
 * @generated from message google.protobuf.EnumValueDescriptorProto
 */
class EnumValueDescriptorProto extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new EnumValueDescriptorProto().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new EnumValueDescriptorProto().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new EnumValueDescriptorProto().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(EnumValueDescriptorProto, a, b);
    }
}
exports.EnumValueDescriptorProto = EnumValueDescriptorProto;
EnumValueDescriptorProto.runtime = proto2_js_1.proto2;
EnumValueDescriptorProto.typeName = "google.protobuf.EnumValueDescriptorProto";
EnumValueDescriptorProto.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 2, name: "number", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 3, name: "options", kind: "message", T: EnumValueOptions, opt: true },
]);
/**
 * Describes a service.
 *
 * @generated from message google.protobuf.ServiceDescriptorProto
 */
class ServiceDescriptorProto extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * @generated from field: repeated google.protobuf.MethodDescriptorProto method = 2;
         */
        this.method = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new ServiceDescriptorProto().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new ServiceDescriptorProto().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new ServiceDescriptorProto().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(ServiceDescriptorProto, a, b);
    }
}
exports.ServiceDescriptorProto = ServiceDescriptorProto;
ServiceDescriptorProto.runtime = proto2_js_1.proto2;
ServiceDescriptorProto.typeName = "google.protobuf.ServiceDescriptorProto";
ServiceDescriptorProto.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 2, name: "method", kind: "message", T: MethodDescriptorProto, repeated: true },
    { no: 3, name: "options", kind: "message", T: ServiceOptions, opt: true },
]);
/**
 * Describes a method of a service.
 *
 * @generated from message google.protobuf.MethodDescriptorProto
 */
class MethodDescriptorProto extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new MethodDescriptorProto().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new MethodDescriptorProto().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new MethodDescriptorProto().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(MethodDescriptorProto, a, b);
    }
}
exports.MethodDescriptorProto = MethodDescriptorProto;
MethodDescriptorProto.runtime = proto2_js_1.proto2;
MethodDescriptorProto.typeName = "google.protobuf.MethodDescriptorProto";
MethodDescriptorProto.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 2, name: "input_type", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 3, name: "output_type", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 4, name: "options", kind: "message", T: MethodOptions, opt: true },
    { no: 5, name: "client_streaming", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 6, name: "server_streaming", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
]);
/**
 * @generated from message google.protobuf.FileOptions
 */
class FileOptions extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The parser stores options it doesn't recognize here.
         * See the documentation for the "Options" section above.
         *
         * @generated from field: repeated google.protobuf.UninterpretedOption uninterpreted_option = 999;
         */
        this.uninterpretedOption = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new FileOptions().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FileOptions().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FileOptions().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(FileOptions, a, b);
    }
}
exports.FileOptions = FileOptions;
FileOptions.runtime = proto2_js_1.proto2;
FileOptions.typeName = "google.protobuf.FileOptions";
FileOptions.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "java_package", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 8, name: "java_outer_classname", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 10, name: "java_multiple_files", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 20, name: "java_generate_equals_and_hash", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true },
    { no: 27, name: "java_string_check_utf8", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 9, name: "optimize_for", kind: "enum", T: proto2_js_1.proto2.getEnumType(FileOptions_OptimizeMode), opt: true, default: FileOptions_OptimizeMode.SPEED },
    { no: 11, name: "go_package", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 16, name: "cc_generic_services", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 17, name: "java_generic_services", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 18, name: "py_generic_services", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 23, name: "deprecated", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 31, name: "cc_enable_arenas", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: true },
    { no: 36, name: "objc_class_prefix", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 37, name: "csharp_namespace", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 39, name: "swift_prefix", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 40, name: "php_class_prefix", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 41, name: "php_namespace", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 44, name: "php_metadata_namespace", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 45, name: "ruby_package", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 50, name: "features", kind: "message", T: FeatureSet, opt: true },
    { no: 999, name: "uninterpreted_option", kind: "message", T: UninterpretedOption, repeated: true },
]);
/**
 * Generated classes can be optimized for speed or code size.
 *
 * @generated from enum google.protobuf.FileOptions.OptimizeMode
 */
var FileOptions_OptimizeMode;
(function (FileOptions_OptimizeMode) {
    /**
     * Generate complete code for parsing, serialization,
     *
     * @generated from enum value: SPEED = 1;
     */
    FileOptions_OptimizeMode[FileOptions_OptimizeMode["SPEED"] = 1] = "SPEED";
    /**
     * etc.
     *
     * Use ReflectionOps to implement these methods.
     *
     * @generated from enum value: CODE_SIZE = 2;
     */
    FileOptions_OptimizeMode[FileOptions_OptimizeMode["CODE_SIZE"] = 2] = "CODE_SIZE";
    /**
     * Generate code using MessageLite and the lite runtime.
     *
     * @generated from enum value: LITE_RUNTIME = 3;
     */
    FileOptions_OptimizeMode[FileOptions_OptimizeMode["LITE_RUNTIME"] = 3] = "LITE_RUNTIME";
})(FileOptions_OptimizeMode || (exports.FileOptions_OptimizeMode = FileOptions_OptimizeMode = {}));
// Retrieve enum metadata with: proto2.getEnumType(FileOptions_OptimizeMode)
proto2_js_1.proto2.util.setEnumType(FileOptions_OptimizeMode, "google.protobuf.FileOptions.OptimizeMode", [
    { no: 1, name: "SPEED" },
    { no: 2, name: "CODE_SIZE" },
    { no: 3, name: "LITE_RUNTIME" },
]);
/**
 * @generated from message google.protobuf.MessageOptions
 */
class MessageOptions extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The parser stores options it doesn't recognize here. See above.
         *
         * @generated from field: repeated google.protobuf.UninterpretedOption uninterpreted_option = 999;
         */
        this.uninterpretedOption = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new MessageOptions().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new MessageOptions().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new MessageOptions().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(MessageOptions, a, b);
    }
}
exports.MessageOptions = MessageOptions;
MessageOptions.runtime = proto2_js_1.proto2;
MessageOptions.typeName = "google.protobuf.MessageOptions";
MessageOptions.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "message_set_wire_format", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 2, name: "no_standard_descriptor_accessor", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 3, name: "deprecated", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 7, name: "map_entry", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true },
    { no: 11, name: "deprecated_legacy_json_field_conflicts", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true },
    { no: 12, name: "features", kind: "message", T: FeatureSet, opt: true },
    { no: 999, name: "uninterpreted_option", kind: "message", T: UninterpretedOption, repeated: true },
]);
/**
 * @generated from message google.protobuf.FieldOptions
 */
class FieldOptions extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * @generated from field: repeated google.protobuf.FieldOptions.OptionTargetType targets = 19;
         */
        this.targets = [];
        /**
         * @generated from field: repeated google.protobuf.FieldOptions.EditionDefault edition_defaults = 20;
         */
        this.editionDefaults = [];
        /**
         * The parser stores options it doesn't recognize here. See above.
         *
         * @generated from field: repeated google.protobuf.UninterpretedOption uninterpreted_option = 999;
         */
        this.uninterpretedOption = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new FieldOptions().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FieldOptions().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FieldOptions().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(FieldOptions, a, b);
    }
}
exports.FieldOptions = FieldOptions;
FieldOptions.runtime = proto2_js_1.proto2;
FieldOptions.typeName = "google.protobuf.FieldOptions";
FieldOptions.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "ctype", kind: "enum", T: proto2_js_1.proto2.getEnumType(FieldOptions_CType), opt: true, default: FieldOptions_CType.STRING },
    { no: 2, name: "packed", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true },
    { no: 6, name: "jstype", kind: "enum", T: proto2_js_1.proto2.getEnumType(FieldOptions_JSType), opt: true, default: FieldOptions_JSType.JS_NORMAL },
    { no: 5, name: "lazy", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 15, name: "unverified_lazy", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 3, name: "deprecated", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 10, name: "weak", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 16, name: "debug_redact", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 17, name: "retention", kind: "enum", T: proto2_js_1.proto2.getEnumType(FieldOptions_OptionRetention), opt: true },
    { no: 19, name: "targets", kind: "enum", T: proto2_js_1.proto2.getEnumType(FieldOptions_OptionTargetType), repeated: true },
    { no: 20, name: "edition_defaults", kind: "message", T: FieldOptions_EditionDefault, repeated: true },
    { no: 21, name: "features", kind: "message", T: FeatureSet, opt: true },
    { no: 22, name: "feature_support", kind: "message", T: FieldOptions_FeatureSupport, opt: true },
    { no: 999, name: "uninterpreted_option", kind: "message", T: UninterpretedOption, repeated: true },
]);
/**
 * @generated from enum google.protobuf.FieldOptions.CType
 */
var FieldOptions_CType;
(function (FieldOptions_CType) {
    /**
     * Default mode.
     *
     * @generated from enum value: STRING = 0;
     */
    FieldOptions_CType[FieldOptions_CType["STRING"] = 0] = "STRING";
    /**
     * The option [ctype=CORD] may be applied to a non-repeated field of type
     * "bytes". It indicates that in C++, the data should be stored in a Cord
     * instead of a string.  For very large strings, this may reduce memory
     * fragmentation. It may also allow better performance when parsing from a
     * Cord, or when parsing with aliasing enabled, as the parsed Cord may then
     * alias the original buffer.
     *
     * @generated from enum value: CORD = 1;
     */
    FieldOptions_CType[FieldOptions_CType["CORD"] = 1] = "CORD";
    /**
     * @generated from enum value: STRING_PIECE = 2;
     */
    FieldOptions_CType[FieldOptions_CType["STRING_PIECE"] = 2] = "STRING_PIECE";
})(FieldOptions_CType || (exports.FieldOptions_CType = FieldOptions_CType = {}));
// Retrieve enum metadata with: proto2.getEnumType(FieldOptions_CType)
proto2_js_1.proto2.util.setEnumType(FieldOptions_CType, "google.protobuf.FieldOptions.CType", [
    { no: 0, name: "STRING" },
    { no: 1, name: "CORD" },
    { no: 2, name: "STRING_PIECE" },
]);
/**
 * @generated from enum google.protobuf.FieldOptions.JSType
 */
var FieldOptions_JSType;
(function (FieldOptions_JSType) {
    /**
     * Use the default type.
     *
     * @generated from enum value: JS_NORMAL = 0;
     */
    FieldOptions_JSType[FieldOptions_JSType["JS_NORMAL"] = 0] = "JS_NORMAL";
    /**
     * Use JavaScript strings.
     *
     * @generated from enum value: JS_STRING = 1;
     */
    FieldOptions_JSType[FieldOptions_JSType["JS_STRING"] = 1] = "JS_STRING";
    /**
     * Use JavaScript numbers.
     *
     * @generated from enum value: JS_NUMBER = 2;
     */
    FieldOptions_JSType[FieldOptions_JSType["JS_NUMBER"] = 2] = "JS_NUMBER";
})(FieldOptions_JSType || (exports.FieldOptions_JSType = FieldOptions_JSType = {}));
// Retrieve enum metadata with: proto2.getEnumType(FieldOptions_JSType)
proto2_js_1.proto2.util.setEnumType(FieldOptions_JSType, "google.protobuf.FieldOptions.JSType", [
    { no: 0, name: "JS_NORMAL" },
    { no: 1, name: "JS_STRING" },
    { no: 2, name: "JS_NUMBER" },
]);
/**
 * If set to RETENTION_SOURCE, the option will be omitted from the binary.
 * Note: as of January 2023, support for this is in progress and does not yet
 * have an effect (b/264593489).
 *
 * @generated from enum google.protobuf.FieldOptions.OptionRetention
 */
var FieldOptions_OptionRetention;
(function (FieldOptions_OptionRetention) {
    /**
     * @generated from enum value: RETENTION_UNKNOWN = 0;
     */
    FieldOptions_OptionRetention[FieldOptions_OptionRetention["RETENTION_UNKNOWN"] = 0] = "RETENTION_UNKNOWN";
    /**
     * @generated from enum value: RETENTION_RUNTIME = 1;
     */
    FieldOptions_OptionRetention[FieldOptions_OptionRetention["RETENTION_RUNTIME"] = 1] = "RETENTION_RUNTIME";
    /**
     * @generated from enum value: RETENTION_SOURCE = 2;
     */
    FieldOptions_OptionRetention[FieldOptions_OptionRetention["RETENTION_SOURCE"] = 2] = "RETENTION_SOURCE";
})(FieldOptions_OptionRetention || (exports.FieldOptions_OptionRetention = FieldOptions_OptionRetention = {}));
// Retrieve enum metadata with: proto2.getEnumType(FieldOptions_OptionRetention)
proto2_js_1.proto2.util.setEnumType(FieldOptions_OptionRetention, "google.protobuf.FieldOptions.OptionRetention", [
    { no: 0, name: "RETENTION_UNKNOWN" },
    { no: 1, name: "RETENTION_RUNTIME" },
    { no: 2, name: "RETENTION_SOURCE" },
]);
/**
 * This indicates the types of entities that the field may apply to when used
 * as an option. If it is unset, then the field may be freely used as an
 * option on any kind of entity. Note: as of January 2023, support for this is
 * in progress and does not yet have an effect (b/264593489).
 *
 * @generated from enum google.protobuf.FieldOptions.OptionTargetType
 */
var FieldOptions_OptionTargetType;
(function (FieldOptions_OptionTargetType) {
    /**
     * @generated from enum value: TARGET_TYPE_UNKNOWN = 0;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_UNKNOWN"] = 0] = "TARGET_TYPE_UNKNOWN";
    /**
     * @generated from enum value: TARGET_TYPE_FILE = 1;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_FILE"] = 1] = "TARGET_TYPE_FILE";
    /**
     * @generated from enum value: TARGET_TYPE_EXTENSION_RANGE = 2;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_EXTENSION_RANGE"] = 2] = "TARGET_TYPE_EXTENSION_RANGE";
    /**
     * @generated from enum value: TARGET_TYPE_MESSAGE = 3;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_MESSAGE"] = 3] = "TARGET_TYPE_MESSAGE";
    /**
     * @generated from enum value: TARGET_TYPE_FIELD = 4;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_FIELD"] = 4] = "TARGET_TYPE_FIELD";
    /**
     * @generated from enum value: TARGET_TYPE_ONEOF = 5;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_ONEOF"] = 5] = "TARGET_TYPE_ONEOF";
    /**
     * @generated from enum value: TARGET_TYPE_ENUM = 6;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_ENUM"] = 6] = "TARGET_TYPE_ENUM";
    /**
     * @generated from enum value: TARGET_TYPE_ENUM_ENTRY = 7;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_ENUM_ENTRY"] = 7] = "TARGET_TYPE_ENUM_ENTRY";
    /**
     * @generated from enum value: TARGET_TYPE_SERVICE = 8;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_SERVICE"] = 8] = "TARGET_TYPE_SERVICE";
    /**
     * @generated from enum value: TARGET_TYPE_METHOD = 9;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_METHOD"] = 9] = "TARGET_TYPE_METHOD";
})(FieldOptions_OptionTargetType || (exports.FieldOptions_OptionTargetType = FieldOptions_OptionTargetType = {}));
// Retrieve enum metadata with: proto2.getEnumType(FieldOptions_OptionTargetType)
proto2_js_1.proto2.util.setEnumType(FieldOptions_OptionTargetType, "google.protobuf.FieldOptions.OptionTargetType", [
    { no: 0, name: "TARGET_TYPE_UNKNOWN" },
    { no: 1, name: "TARGET_TYPE_FILE" },
    { no: 2, name: "TARGET_TYPE_EXTENSION_RANGE" },
    { no: 3, name: "TARGET_TYPE_MESSAGE" },
    { no: 4, name: "TARGET_TYPE_FIELD" },
    { no: 5, name: "TARGET_TYPE_ONEOF" },
    { no: 6, name: "TARGET_TYPE_ENUM" },
    { no: 7, name: "TARGET_TYPE_ENUM_ENTRY" },
    { no: 8, name: "TARGET_TYPE_SERVICE" },
    { no: 9, name: "TARGET_TYPE_METHOD" },
]);
/**
 * @generated from message google.protobuf.FieldOptions.EditionDefault
 */
class FieldOptions_EditionDefault extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new FieldOptions_EditionDefault().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FieldOptions_EditionDefault().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FieldOptions_EditionDefault().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(FieldOptions_EditionDefault, a, b);
    }
}
exports.FieldOptions_EditionDefault = FieldOptions_EditionDefault;
FieldOptions_EditionDefault.runtime = proto2_js_1.proto2;
FieldOptions_EditionDefault.typeName = "google.protobuf.FieldOptions.EditionDefault";
FieldOptions_EditionDefault.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 3, name: "edition", kind: "enum", T: proto2_js_1.proto2.getEnumType(Edition), opt: true },
    { no: 2, name: "value", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
]);
/**
 * Information about the support window of a feature.
 *
 * @generated from message google.protobuf.FieldOptions.FeatureSupport
 */
class FieldOptions_FeatureSupport extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new FieldOptions_FeatureSupport().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FieldOptions_FeatureSupport().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FieldOptions_FeatureSupport().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(FieldOptions_FeatureSupport, a, b);
    }
}
exports.FieldOptions_FeatureSupport = FieldOptions_FeatureSupport;
FieldOptions_FeatureSupport.runtime = proto2_js_1.proto2;
FieldOptions_FeatureSupport.typeName = "google.protobuf.FieldOptions.FeatureSupport";
FieldOptions_FeatureSupport.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "edition_introduced", kind: "enum", T: proto2_js_1.proto2.getEnumType(Edition), opt: true },
    { no: 2, name: "edition_deprecated", kind: "enum", T: proto2_js_1.proto2.getEnumType(Edition), opt: true },
    { no: 3, name: "deprecation_warning", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 4, name: "edition_removed", kind: "enum", T: proto2_js_1.proto2.getEnumType(Edition), opt: true },
]);
/**
 * @generated from message google.protobuf.OneofOptions
 */
class OneofOptions extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The parser stores options it doesn't recognize here. See above.
         *
         * @generated from field: repeated google.protobuf.UninterpretedOption uninterpreted_option = 999;
         */
        this.uninterpretedOption = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new OneofOptions().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new OneofOptions().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new OneofOptions().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(OneofOptions, a, b);
    }
}
exports.OneofOptions = OneofOptions;
OneofOptions.runtime = proto2_js_1.proto2;
OneofOptions.typeName = "google.protobuf.OneofOptions";
OneofOptions.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "features", kind: "message", T: FeatureSet, opt: true },
    { no: 999, name: "uninterpreted_option", kind: "message", T: UninterpretedOption, repeated: true },
]);
/**
 * @generated from message google.protobuf.EnumOptions
 */
class EnumOptions extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The parser stores options it doesn't recognize here. See above.
         *
         * @generated from field: repeated google.protobuf.UninterpretedOption uninterpreted_option = 999;
         */
        this.uninterpretedOption = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new EnumOptions().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new EnumOptions().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new EnumOptions().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(EnumOptions, a, b);
    }
}
exports.EnumOptions = EnumOptions;
EnumOptions.runtime = proto2_js_1.proto2;
EnumOptions.typeName = "google.protobuf.EnumOptions";
EnumOptions.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 2, name: "allow_alias", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true },
    { no: 3, name: "deprecated", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 6, name: "deprecated_legacy_json_field_conflicts", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true },
    { no: 7, name: "features", kind: "message", T: FeatureSet, opt: true },
    { no: 999, name: "uninterpreted_option", kind: "message", T: UninterpretedOption, repeated: true },
]);
/**
 * @generated from message google.protobuf.EnumValueOptions
 */
class EnumValueOptions extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The parser stores options it doesn't recognize here. See above.
         *
         * @generated from field: repeated google.protobuf.UninterpretedOption uninterpreted_option = 999;
         */
        this.uninterpretedOption = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new EnumValueOptions().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new EnumValueOptions().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new EnumValueOptions().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(EnumValueOptions, a, b);
    }
}
exports.EnumValueOptions = EnumValueOptions;
EnumValueOptions.runtime = proto2_js_1.proto2;
EnumValueOptions.typeName = "google.protobuf.EnumValueOptions";
EnumValueOptions.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "deprecated", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 2, name: "features", kind: "message", T: FeatureSet, opt: true },
    { no: 3, name: "debug_redact", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 4, name: "feature_support", kind: "message", T: FieldOptions_FeatureSupport, opt: true },
    { no: 999, name: "uninterpreted_option", kind: "message", T: UninterpretedOption, repeated: true },
]);
/**
 * @generated from message google.protobuf.ServiceOptions
 */
class ServiceOptions extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The parser stores options it doesn't recognize here. See above.
         *
         * @generated from field: repeated google.protobuf.UninterpretedOption uninterpreted_option = 999;
         */
        this.uninterpretedOption = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new ServiceOptions().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new ServiceOptions().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new ServiceOptions().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(ServiceOptions, a, b);
    }
}
exports.ServiceOptions = ServiceOptions;
ServiceOptions.runtime = proto2_js_1.proto2;
ServiceOptions.typeName = "google.protobuf.ServiceOptions";
ServiceOptions.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 34, name: "features", kind: "message", T: FeatureSet, opt: true },
    { no: 33, name: "deprecated", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 999, name: "uninterpreted_option", kind: "message", T: UninterpretedOption, repeated: true },
]);
/**
 * @generated from message google.protobuf.MethodOptions
 */
class MethodOptions extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The parser stores options it doesn't recognize here. See above.
         *
         * @generated from field: repeated google.protobuf.UninterpretedOption uninterpreted_option = 999;
         */
        this.uninterpretedOption = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new MethodOptions().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new MethodOptions().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new MethodOptions().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(MethodOptions, a, b);
    }
}
exports.MethodOptions = MethodOptions;
MethodOptions.runtime = proto2_js_1.proto2;
MethodOptions.typeName = "google.protobuf.MethodOptions";
MethodOptions.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 33, name: "deprecated", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true, default: false },
    { no: 34, name: "idempotency_level", kind: "enum", T: proto2_js_1.proto2.getEnumType(MethodOptions_IdempotencyLevel), opt: true, default: MethodOptions_IdempotencyLevel.IDEMPOTENCY_UNKNOWN },
    { no: 35, name: "features", kind: "message", T: FeatureSet, opt: true },
    { no: 999, name: "uninterpreted_option", kind: "message", T: UninterpretedOption, repeated: true },
]);
/**
 * Is this method side-effect-free (or safe in HTTP parlance), or idempotent,
 * or neither? HTTP based RPC implementation may choose GET verb for safe
 * methods, and PUT verb for idempotent methods instead of the default POST.
 *
 * @generated from enum google.protobuf.MethodOptions.IdempotencyLevel
 */
var MethodOptions_IdempotencyLevel;
(function (MethodOptions_IdempotencyLevel) {
    /**
     * @generated from enum value: IDEMPOTENCY_UNKNOWN = 0;
     */
    MethodOptions_IdempotencyLevel[MethodOptions_IdempotencyLevel["IDEMPOTENCY_UNKNOWN"] = 0] = "IDEMPOTENCY_UNKNOWN";
    /**
     * implies idempotent
     *
     * @generated from enum value: NO_SIDE_EFFECTS = 1;
     */
    MethodOptions_IdempotencyLevel[MethodOptions_IdempotencyLevel["NO_SIDE_EFFECTS"] = 1] = "NO_SIDE_EFFECTS";
    /**
     * idempotent, but may have side effects
     *
     * @generated from enum value: IDEMPOTENT = 2;
     */
    MethodOptions_IdempotencyLevel[MethodOptions_IdempotencyLevel["IDEMPOTENT"] = 2] = "IDEMPOTENT";
})(MethodOptions_IdempotencyLevel || (exports.MethodOptions_IdempotencyLevel = MethodOptions_IdempotencyLevel = {}));
// Retrieve enum metadata with: proto2.getEnumType(MethodOptions_IdempotencyLevel)
proto2_js_1.proto2.util.setEnumType(MethodOptions_IdempotencyLevel, "google.protobuf.MethodOptions.IdempotencyLevel", [
    { no: 0, name: "IDEMPOTENCY_UNKNOWN" },
    { no: 1, name: "NO_SIDE_EFFECTS" },
    { no: 2, name: "IDEMPOTENT" },
]);
/**
 * A message representing a option the parser does not recognize. This only
 * appears in options protos created by the compiler::Parser class.
 * DescriptorPool resolves these when building Descriptor objects. Therefore,
 * options protos in descriptor objects (e.g. returned by Descriptor::options(),
 * or produced by Descriptor::CopyTo()) will never have UninterpretedOptions
 * in them.
 *
 * @generated from message google.protobuf.UninterpretedOption
 */
class UninterpretedOption extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * @generated from field: repeated google.protobuf.UninterpretedOption.NamePart name = 2;
         */
        this.name = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new UninterpretedOption().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new UninterpretedOption().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new UninterpretedOption().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(UninterpretedOption, a, b);
    }
}
exports.UninterpretedOption = UninterpretedOption;
UninterpretedOption.runtime = proto2_js_1.proto2;
UninterpretedOption.typeName = "google.protobuf.UninterpretedOption";
UninterpretedOption.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 2, name: "name", kind: "message", T: UninterpretedOption_NamePart, repeated: true },
    { no: 3, name: "identifier_value", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 4, name: "positive_int_value", kind: "scalar", T: 4 /* ScalarType.UINT64 */, opt: true },
    { no: 5, name: "negative_int_value", kind: "scalar", T: 3 /* ScalarType.INT64 */, opt: true },
    { no: 6, name: "double_value", kind: "scalar", T: 1 /* ScalarType.DOUBLE */, opt: true },
    { no: 7, name: "string_value", kind: "scalar", T: 12 /* ScalarType.BYTES */, opt: true },
    { no: 8, name: "aggregate_value", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
]);
/**
 * The name of the uninterpreted option.  Each string represents a segment in
 * a dot-separated name.  is_extension is true iff a segment represents an
 * extension (denoted with parentheses in options specs in .proto files).
 * E.g.,{ ["foo", false], ["bar.baz", true], ["moo", false] } represents
 * "foo.(bar.baz).moo".
 *
 * @generated from message google.protobuf.UninterpretedOption.NamePart
 */
class UninterpretedOption_NamePart extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new UninterpretedOption_NamePart().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new UninterpretedOption_NamePart().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new UninterpretedOption_NamePart().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(UninterpretedOption_NamePart, a, b);
    }
}
exports.UninterpretedOption_NamePart = UninterpretedOption_NamePart;
UninterpretedOption_NamePart.runtime = proto2_js_1.proto2;
UninterpretedOption_NamePart.typeName = "google.protobuf.UninterpretedOption.NamePart";
UninterpretedOption_NamePart.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "name_part", kind: "scalar", T: 9 /* ScalarType.STRING */, req: true },
    { no: 2, name: "is_extension", kind: "scalar", T: 8 /* ScalarType.BOOL */, req: true },
]);
/**
 * TODO Enums in C++ gencode (and potentially other languages) are
 * not well scoped.  This means that each of the feature enums below can clash
 * with each other.  The short names we've chosen maximize call-site
 * readability, but leave us very open to this scenario.  A future feature will
 * be designed and implemented to handle this, hopefully before we ever hit a
 * conflict here.
 *
 * @generated from message google.protobuf.FeatureSet
 */
class FeatureSet extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new FeatureSet().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FeatureSet().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FeatureSet().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(FeatureSet, a, b);
    }
}
exports.FeatureSet = FeatureSet;
FeatureSet.runtime = proto2_js_1.proto2;
FeatureSet.typeName = "google.protobuf.FeatureSet";
FeatureSet.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "field_presence", kind: "enum", T: proto2_js_1.proto2.getEnumType(FeatureSet_FieldPresence), opt: true },
    { no: 2, name: "enum_type", kind: "enum", T: proto2_js_1.proto2.getEnumType(FeatureSet_EnumType), opt: true },
    { no: 3, name: "repeated_field_encoding", kind: "enum", T: proto2_js_1.proto2.getEnumType(FeatureSet_RepeatedFieldEncoding), opt: true },
    { no: 4, name: "utf8_validation", kind: "enum", T: proto2_js_1.proto2.getEnumType(FeatureSet_Utf8Validation), opt: true },
    { no: 5, name: "message_encoding", kind: "enum", T: proto2_js_1.proto2.getEnumType(FeatureSet_MessageEncoding), opt: true },
    { no: 6, name: "json_format", kind: "enum", T: proto2_js_1.proto2.getEnumType(FeatureSet_JsonFormat), opt: true },
]);
/**
 * @generated from enum google.protobuf.FeatureSet.FieldPresence
 */
var FeatureSet_FieldPresence;
(function (FeatureSet_FieldPresence) {
    /**
     * @generated from enum value: FIELD_PRESENCE_UNKNOWN = 0;
     */
    FeatureSet_FieldPresence[FeatureSet_FieldPresence["FIELD_PRESENCE_UNKNOWN"] = 0] = "FIELD_PRESENCE_UNKNOWN";
    /**
     * @generated from enum value: EXPLICIT = 1;
     */
    FeatureSet_FieldPresence[FeatureSet_FieldPresence["EXPLICIT"] = 1] = "EXPLICIT";
    /**
     * @generated from enum value: IMPLICIT = 2;
     */
    FeatureSet_FieldPresence[FeatureSet_FieldPresence["IMPLICIT"] = 2] = "IMPLICIT";
    /**
     * @generated from enum value: LEGACY_REQUIRED = 3;
     */
    FeatureSet_FieldPresence[FeatureSet_FieldPresence["LEGACY_REQUIRED"] = 3] = "LEGACY_REQUIRED";
})(FeatureSet_FieldPresence || (exports.FeatureSet_FieldPresence = FeatureSet_FieldPresence = {}));
// Retrieve enum metadata with: proto2.getEnumType(FeatureSet_FieldPresence)
proto2_js_1.proto2.util.setEnumType(FeatureSet_FieldPresence, "google.protobuf.FeatureSet.FieldPresence", [
    { no: 0, name: "FIELD_PRESENCE_UNKNOWN" },
    { no: 1, name: "EXPLICIT" },
    { no: 2, name: "IMPLICIT" },
    { no: 3, name: "LEGACY_REQUIRED" },
]);
/**
 * @generated from enum google.protobuf.FeatureSet.EnumType
 */
var FeatureSet_EnumType;
(function (FeatureSet_EnumType) {
    /**
     * @generated from enum value: ENUM_TYPE_UNKNOWN = 0;
     */
    FeatureSet_EnumType[FeatureSet_EnumType["ENUM_TYPE_UNKNOWN"] = 0] = "ENUM_TYPE_UNKNOWN";
    /**
     * @generated from enum value: OPEN = 1;
     */
    FeatureSet_EnumType[FeatureSet_EnumType["OPEN"] = 1] = "OPEN";
    /**
     * @generated from enum value: CLOSED = 2;
     */
    FeatureSet_EnumType[FeatureSet_EnumType["CLOSED"] = 2] = "CLOSED";
})(FeatureSet_EnumType || (exports.FeatureSet_EnumType = FeatureSet_EnumType = {}));
// Retrieve enum metadata with: proto2.getEnumType(FeatureSet_EnumType)
proto2_js_1.proto2.util.setEnumType(FeatureSet_EnumType, "google.protobuf.FeatureSet.EnumType", [
    { no: 0, name: "ENUM_TYPE_UNKNOWN" },
    { no: 1, name: "OPEN" },
    { no: 2, name: "CLOSED" },
]);
/**
 * @generated from enum google.protobuf.FeatureSet.RepeatedFieldEncoding
 */
var FeatureSet_RepeatedFieldEncoding;
(function (FeatureSet_RepeatedFieldEncoding) {
    /**
     * @generated from enum value: REPEATED_FIELD_ENCODING_UNKNOWN = 0;
     */
    FeatureSet_RepeatedFieldEncoding[FeatureSet_RepeatedFieldEncoding["REPEATED_FIELD_ENCODING_UNKNOWN"] = 0] = "REPEATED_FIELD_ENCODING_UNKNOWN";
    /**
     * @generated from enum value: PACKED = 1;
     */
    FeatureSet_RepeatedFieldEncoding[FeatureSet_RepeatedFieldEncoding["PACKED"] = 1] = "PACKED";
    /**
     * @generated from enum value: EXPANDED = 2;
     */
    FeatureSet_RepeatedFieldEncoding[FeatureSet_RepeatedFieldEncoding["EXPANDED"] = 2] = "EXPANDED";
})(FeatureSet_RepeatedFieldEncoding || (exports.FeatureSet_RepeatedFieldEncoding = FeatureSet_RepeatedFieldEncoding = {}));
// Retrieve enum metadata with: proto2.getEnumType(FeatureSet_RepeatedFieldEncoding)
proto2_js_1.proto2.util.setEnumType(FeatureSet_RepeatedFieldEncoding, "google.protobuf.FeatureSet.RepeatedFieldEncoding", [
    { no: 0, name: "REPEATED_FIELD_ENCODING_UNKNOWN" },
    { no: 1, name: "PACKED" },
    { no: 2, name: "EXPANDED" },
]);
/**
 * @generated from enum google.protobuf.FeatureSet.Utf8Validation
 */
var FeatureSet_Utf8Validation;
(function (FeatureSet_Utf8Validation) {
    /**
     * @generated from enum value: UTF8_VALIDATION_UNKNOWN = 0;
     */
    FeatureSet_Utf8Validation[FeatureSet_Utf8Validation["UTF8_VALIDATION_UNKNOWN"] = 0] = "UTF8_VALIDATION_UNKNOWN";
    /**
     * @generated from enum value: VERIFY = 2;
     */
    FeatureSet_Utf8Validation[FeatureSet_Utf8Validation["VERIFY"] = 2] = "VERIFY";
    /**
     * @generated from enum value: NONE = 3;
     */
    FeatureSet_Utf8Validation[FeatureSet_Utf8Validation["NONE"] = 3] = "NONE";
})(FeatureSet_Utf8Validation || (exports.FeatureSet_Utf8Validation = FeatureSet_Utf8Validation = {}));
// Retrieve enum metadata with: proto2.getEnumType(FeatureSet_Utf8Validation)
proto2_js_1.proto2.util.setEnumType(FeatureSet_Utf8Validation, "google.protobuf.FeatureSet.Utf8Validation", [
    { no: 0, name: "UTF8_VALIDATION_UNKNOWN" },
    { no: 2, name: "VERIFY" },
    { no: 3, name: "NONE" },
]);
/**
 * @generated from enum google.protobuf.FeatureSet.MessageEncoding
 */
var FeatureSet_MessageEncoding;
(function (FeatureSet_MessageEncoding) {
    /**
     * @generated from enum value: MESSAGE_ENCODING_UNKNOWN = 0;
     */
    FeatureSet_MessageEncoding[FeatureSet_MessageEncoding["MESSAGE_ENCODING_UNKNOWN"] = 0] = "MESSAGE_ENCODING_UNKNOWN";
    /**
     * @generated from enum value: LENGTH_PREFIXED = 1;
     */
    FeatureSet_MessageEncoding[FeatureSet_MessageEncoding["LENGTH_PREFIXED"] = 1] = "LENGTH_PREFIXED";
    /**
     * @generated from enum value: DELIMITED = 2;
     */
    FeatureSet_MessageEncoding[FeatureSet_MessageEncoding["DELIMITED"] = 2] = "DELIMITED";
})(FeatureSet_MessageEncoding || (exports.FeatureSet_MessageEncoding = FeatureSet_MessageEncoding = {}));
// Retrieve enum metadata with: proto2.getEnumType(FeatureSet_MessageEncoding)
proto2_js_1.proto2.util.setEnumType(FeatureSet_MessageEncoding, "google.protobuf.FeatureSet.MessageEncoding", [
    { no: 0, name: "MESSAGE_ENCODING_UNKNOWN" },
    { no: 1, name: "LENGTH_PREFIXED" },
    { no: 2, name: "DELIMITED" },
]);
/**
 * @generated from enum google.protobuf.FeatureSet.JsonFormat
 */
var FeatureSet_JsonFormat;
(function (FeatureSet_JsonFormat) {
    /**
     * @generated from enum value: JSON_FORMAT_UNKNOWN = 0;
     */
    FeatureSet_JsonFormat[FeatureSet_JsonFormat["JSON_FORMAT_UNKNOWN"] = 0] = "JSON_FORMAT_UNKNOWN";
    /**
     * @generated from enum value: ALLOW = 1;
     */
    FeatureSet_JsonFormat[FeatureSet_JsonFormat["ALLOW"] = 1] = "ALLOW";
    /**
     * @generated from enum value: LEGACY_BEST_EFFORT = 2;
     */
    FeatureSet_JsonFormat[FeatureSet_JsonFormat["LEGACY_BEST_EFFORT"] = 2] = "LEGACY_BEST_EFFORT";
})(FeatureSet_JsonFormat || (exports.FeatureSet_JsonFormat = FeatureSet_JsonFormat = {}));
// Retrieve enum metadata with: proto2.getEnumType(FeatureSet_JsonFormat)
proto2_js_1.proto2.util.setEnumType(FeatureSet_JsonFormat, "google.protobuf.FeatureSet.JsonFormat", [
    { no: 0, name: "JSON_FORMAT_UNKNOWN" },
    { no: 1, name: "ALLOW" },
    { no: 2, name: "LEGACY_BEST_EFFORT" },
]);
/**
 * A compiled specification for the defaults of a set of features.  These
 * messages are generated from FeatureSet extensions and can be used to seed
 * feature resolution. The resolution with this object becomes a simple search
 * for the closest matching edition, followed by proto merges.
 *
 * @generated from message google.protobuf.FeatureSetDefaults
 */
class FeatureSetDefaults extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * @generated from field: repeated google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault defaults = 1;
         */
        this.defaults = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new FeatureSetDefaults().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FeatureSetDefaults().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FeatureSetDefaults().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(FeatureSetDefaults, a, b);
    }
}
exports.FeatureSetDefaults = FeatureSetDefaults;
FeatureSetDefaults.runtime = proto2_js_1.proto2;
FeatureSetDefaults.typeName = "google.protobuf.FeatureSetDefaults";
FeatureSetDefaults.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "defaults", kind: "message", T: FeatureSetDefaults_FeatureSetEditionDefault, repeated: true },
    { no: 4, name: "minimum_edition", kind: "enum", T: proto2_js_1.proto2.getEnumType(Edition), opt: true },
    { no: 5, name: "maximum_edition", kind: "enum", T: proto2_js_1.proto2.getEnumType(Edition), opt: true },
]);
/**
 * A map from every known edition with a unique set of defaults to its
 * defaults. Not all editions may be contained here.  For a given edition,
 * the defaults at the closest matching edition ordered at or before it should
 * be used.  This field must be in strict ascending order by edition.
 *
 * @generated from message google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault
 */
class FeatureSetDefaults_FeatureSetEditionDefault extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new FeatureSetDefaults_FeatureSetEditionDefault().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FeatureSetDefaults_FeatureSetEditionDefault().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FeatureSetDefaults_FeatureSetEditionDefault().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(FeatureSetDefaults_FeatureSetEditionDefault, a, b);
    }
}
exports.FeatureSetDefaults_FeatureSetEditionDefault = FeatureSetDefaults_FeatureSetEditionDefault;
FeatureSetDefaults_FeatureSetEditionDefault.runtime = proto2_js_1.proto2;
FeatureSetDefaults_FeatureSetEditionDefault.typeName = "google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault";
FeatureSetDefaults_FeatureSetEditionDefault.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 3, name: "edition", kind: "enum", T: proto2_js_1.proto2.getEnumType(Edition), opt: true },
    { no: 4, name: "overridable_features", kind: "message", T: FeatureSet, opt: true },
    { no: 5, name: "fixed_features", kind: "message", T: FeatureSet, opt: true },
]);
/**
 * Encapsulates information about the original source file from which a
 * FileDescriptorProto was generated.
 *
 * @generated from message google.protobuf.SourceCodeInfo
 */
class SourceCodeInfo extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * A Location identifies a piece of source code in a .proto file which
         * corresponds to a particular definition.  This information is intended
         * to be useful to IDEs, code indexers, documentation generators, and similar
         * tools.
         *
         * For example, say we have a file like:
         *   message Foo {
         *     optional string foo = 1;
         *   }
         * Let's look at just the field definition:
         *   optional string foo = 1;
         *   ^       ^^     ^^  ^  ^^^
         *   a       bc     de  f  ghi
         * We have the following locations:
         *   span   path               represents
         *   [a,i)  [ 4, 0, 2, 0 ]     The whole field definition.
         *   [a,b)  [ 4, 0, 2, 0, 4 ]  The label (optional).
         *   [c,d)  [ 4, 0, 2, 0, 5 ]  The type (string).
         *   [e,f)  [ 4, 0, 2, 0, 1 ]  The name (foo).
         *   [g,h)  [ 4, 0, 2, 0, 3 ]  The number (1).
         *
         * Notes:
         * - A location may refer to a repeated field itself (i.e. not to any
         *   particular index within it).  This is used whenever a set of elements are
         *   logically enclosed in a single code segment.  For example, an entire
         *   extend block (possibly containing multiple extension definitions) will
         *   have an outer location whose path refers to the "extensions" repeated
         *   field without an index.
         * - Multiple locations may have the same path.  This happens when a single
         *   logical declaration is spread out across multiple places.  The most
         *   obvious example is the "extend" block again -- there may be multiple
         *   extend blocks in the same scope, each of which will have the same path.
         * - A location's span is not always a subset of its parent's span.  For
         *   example, the "extendee" of an extension declaration appears at the
         *   beginning of the "extend" block and is shared by all extensions within
         *   the block.
         * - Just because a location's span is a subset of some other location's span
         *   does not mean that it is a descendant.  For example, a "group" defines
         *   both a type and a field in a single declaration.  Thus, the locations
         *   corresponding to the type and field and their components will overlap.
         * - Code which tries to interpret locations should probably be designed to
         *   ignore those that it doesn't understand, as more types of locations could
         *   be recorded in the future.
         *
         * @generated from field: repeated google.protobuf.SourceCodeInfo.Location location = 1;
         */
        this.location = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new SourceCodeInfo().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new SourceCodeInfo().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new SourceCodeInfo().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(SourceCodeInfo, a, b);
    }
}
exports.SourceCodeInfo = SourceCodeInfo;
SourceCodeInfo.runtime = proto2_js_1.proto2;
SourceCodeInfo.typeName = "google.protobuf.SourceCodeInfo";
SourceCodeInfo.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "location", kind: "message", T: SourceCodeInfo_Location, repeated: true },
]);
/**
 * @generated from message google.protobuf.SourceCodeInfo.Location
 */
class SourceCodeInfo_Location extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * Identifies which part of the FileDescriptorProto was defined at this
         * location.
         *
         * Each element is a field number or an index.  They form a path from
         * the root FileDescriptorProto to the place where the definition appears.
         * For example, this path:
         *   [ 4, 3, 2, 7, 1 ]
         * refers to:
         *   file.message_type(3)  // 4, 3
         *       .field(7)         // 2, 7
         *       .name()           // 1
         * This is because FileDescriptorProto.message_type has field number 4:
         *   repeated DescriptorProto message_type = 4;
         * and DescriptorProto.field has field number 2:
         *   repeated FieldDescriptorProto field = 2;
         * and FieldDescriptorProto.name has field number 1:
         *   optional string name = 1;
         *
         * Thus, the above path gives the location of a field name.  If we removed
         * the last element:
         *   [ 4, 3, 2, 7 ]
         * this path refers to the whole field declaration (from the beginning
         * of the label to the terminating semicolon).
         *
         * @generated from field: repeated int32 path = 1 [packed = true];
         */
        this.path = [];
        /**
         * Always has exactly three or four elements: start line, start column,
         * end line (optional, otherwise assumed same as start line), end column.
         * These are packed into a single field for efficiency.  Note that line
         * and column numbers are zero-based -- typically you will want to add
         * 1 to each before displaying to a user.
         *
         * @generated from field: repeated int32 span = 2 [packed = true];
         */
        this.span = [];
        /**
         * @generated from field: repeated string leading_detached_comments = 6;
         */
        this.leadingDetachedComments = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new SourceCodeInfo_Location().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new SourceCodeInfo_Location().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new SourceCodeInfo_Location().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(SourceCodeInfo_Location, a, b);
    }
}
exports.SourceCodeInfo_Location = SourceCodeInfo_Location;
SourceCodeInfo_Location.runtime = proto2_js_1.proto2;
SourceCodeInfo_Location.typeName = "google.protobuf.SourceCodeInfo.Location";
SourceCodeInfo_Location.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "path", kind: "scalar", T: 5 /* ScalarType.INT32 */, repeated: true, packed: true },
    { no: 2, name: "span", kind: "scalar", T: 5 /* ScalarType.INT32 */, repeated: true, packed: true },
    { no: 3, name: "leading_comments", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 4, name: "trailing_comments", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 6, name: "leading_detached_comments", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
]);
/**
 * Describes the relationship between generated code and its original source
 * file. A GeneratedCodeInfo message is associated with only one generated
 * source file, but may contain references to different source .proto files.
 *
 * @generated from message google.protobuf.GeneratedCodeInfo
 */
class GeneratedCodeInfo extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * An Annotation connects some span of text in generated code to an element
         * of its generating .proto file.
         *
         * @generated from field: repeated google.protobuf.GeneratedCodeInfo.Annotation annotation = 1;
         */
        this.annotation = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new GeneratedCodeInfo().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new GeneratedCodeInfo().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new GeneratedCodeInfo().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(GeneratedCodeInfo, a, b);
    }
}
exports.GeneratedCodeInfo = GeneratedCodeInfo;
GeneratedCodeInfo.runtime = proto2_js_1.proto2;
GeneratedCodeInfo.typeName = "google.protobuf.GeneratedCodeInfo";
GeneratedCodeInfo.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "annotation", kind: "message", T: GeneratedCodeInfo_Annotation, repeated: true },
]);
/**
 * @generated from message google.protobuf.GeneratedCodeInfo.Annotation
 */
class GeneratedCodeInfo_Annotation extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * Identifies the element in the original source .proto file. This field
         * is formatted the same as SourceCodeInfo.Location.path.
         *
         * @generated from field: repeated int32 path = 1 [packed = true];
         */
        this.path = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new GeneratedCodeInfo_Annotation().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new GeneratedCodeInfo_Annotation().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new GeneratedCodeInfo_Annotation().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(GeneratedCodeInfo_Annotation, a, b);
    }
}
exports.GeneratedCodeInfo_Annotation = GeneratedCodeInfo_Annotation;
GeneratedCodeInfo_Annotation.runtime = proto2_js_1.proto2;
GeneratedCodeInfo_Annotation.typeName = "google.protobuf.GeneratedCodeInfo.Annotation";
GeneratedCodeInfo_Annotation.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "path", kind: "scalar", T: 5 /* ScalarType.INT32 */, repeated: true, packed: true },
    { no: 2, name: "source_file", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 3, name: "begin", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 4, name: "end", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 5, name: "semantic", kind: "enum", T: proto2_js_1.proto2.getEnumType(GeneratedCodeInfo_Annotation_Semantic), opt: true },
]);
/**
 * Represents the identified object's effect on the element in the original
 * .proto file.
 *
 * @generated from enum google.protobuf.GeneratedCodeInfo.Annotation.Semantic
 */
var GeneratedCodeInfo_Annotation_Semantic;
(function (GeneratedCodeInfo_Annotation_Semantic) {
    /**
     * There is no effect or the effect is indescribable.
     *
     * @generated from enum value: NONE = 0;
     */
    GeneratedCodeInfo_Annotation_Semantic[GeneratedCodeInfo_Annotation_Semantic["NONE"] = 0] = "NONE";
    /**
     * The element is set or otherwise mutated.
     *
     * @generated from enum value: SET = 1;
     */
    GeneratedCodeInfo_Annotation_Semantic[GeneratedCodeInfo_Annotation_Semantic["SET"] = 1] = "SET";
    /**
     * An alias to the element is returned.
     *
     * @generated from enum value: ALIAS = 2;
     */
    GeneratedCodeInfo_Annotation_Semantic[GeneratedCodeInfo_Annotation_Semantic["ALIAS"] = 2] = "ALIAS";
})(GeneratedCodeInfo_Annotation_Semantic || (exports.GeneratedCodeInfo_Annotation_Semantic = GeneratedCodeInfo_Annotation_Semantic = {}));
// Retrieve enum metadata with: proto2.getEnumType(GeneratedCodeInfo_Annotation_Semantic)
proto2_js_1.proto2.util.setEnumType(GeneratedCodeInfo_Annotation_Semantic, "google.protobuf.GeneratedCodeInfo.Annotation.Semantic", [
    { no: 0, name: "NONE" },
    { no: 1, name: "SET" },
    { no: 2, name: "ALIAS" },
]);


/***/ }),
/* 43 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseTextFormatScalarValue = exports.parseTextFormatEnumValue = void 0;
const assert_js_1 = __webpack_require__(14);
const proto_int64_js_1 = __webpack_require__(19);
const scalar_js_1 = __webpack_require__(21);
function parseTextFormatEnumValue(descEnum, value) {
    const enumValue = descEnum.values.find((v) => v.name === value);
    (0, assert_js_1.assert)(enumValue, `cannot parse ${descEnum.name} default value: ${value}`);
    return enumValue.number;
}
exports.parseTextFormatEnumValue = parseTextFormatEnumValue;
function parseTextFormatScalarValue(type, value) {
    switch (type) {
        case scalar_js_1.ScalarType.STRING:
            return value;
        case scalar_js_1.ScalarType.BYTES: {
            const u = unescapeBytesDefaultValue(value);
            if (u === false) {
                throw new Error(`cannot parse ${scalar_js_1.ScalarType[type]} default value: ${value}`);
            }
            return u;
        }
        case scalar_js_1.ScalarType.INT64:
        case scalar_js_1.ScalarType.SFIXED64:
        case scalar_js_1.ScalarType.SINT64:
            return proto_int64_js_1.protoInt64.parse(value);
        case scalar_js_1.ScalarType.UINT64:
        case scalar_js_1.ScalarType.FIXED64:
            return proto_int64_js_1.protoInt64.uParse(value);
        case scalar_js_1.ScalarType.DOUBLE:
        case scalar_js_1.ScalarType.FLOAT:
            switch (value) {
                case "inf":
                    return Number.POSITIVE_INFINITY;
                case "-inf":
                    return Number.NEGATIVE_INFINITY;
                case "nan":
                    return Number.NaN;
                default:
                    return parseFloat(value);
            }
        case scalar_js_1.ScalarType.BOOL:
            return value === "true";
        case scalar_js_1.ScalarType.INT32:
        case scalar_js_1.ScalarType.UINT32:
        case scalar_js_1.ScalarType.SINT32:
        case scalar_js_1.ScalarType.FIXED32:
        case scalar_js_1.ScalarType.SFIXED32:
            return parseInt(value, 10);
    }
}
exports.parseTextFormatScalarValue = parseTextFormatScalarValue;
/**
 * Parses a text-encoded default value (proto2) of a BYTES field.
 */
function unescapeBytesDefaultValue(str) {
    const b = [];
    const input = {
        tail: str,
        c: "",
        next() {
            if (this.tail.length == 0) {
                return false;
            }
            this.c = this.tail[0];
            this.tail = this.tail.substring(1);
            return true;
        },
        take(n) {
            if (this.tail.length >= n) {
                const r = this.tail.substring(0, n);
                this.tail = this.tail.substring(n);
                return r;
            }
            return false;
        },
    };
    while (input.next()) {
        switch (input.c) {
            case "\\":
                if (input.next()) {
                    switch (input.c) {
                        case "\\":
                            b.push(input.c.charCodeAt(0));
                            break;
                        case "b":
                            b.push(0x08);
                            break;
                        case "f":
                            b.push(0x0c);
                            break;
                        case "n":
                            b.push(0x0a);
                            break;
                        case "r":
                            b.push(0x0d);
                            break;
                        case "t":
                            b.push(0x09);
                            break;
                        case "v":
                            b.push(0x0b);
                            break;
                        case "0":
                        case "1":
                        case "2":
                        case "3":
                        case "4":
                        case "5":
                        case "6":
                        case "7": {
                            const s = input.c;
                            const t = input.take(2);
                            if (t === false) {
                                return false;
                            }
                            const n = parseInt(s + t, 8);
                            if (isNaN(n)) {
                                return false;
                            }
                            b.push(n);
                            break;
                        }
                        case "x": {
                            const s = input.c;
                            const t = input.take(2);
                            if (t === false) {
                                return false;
                            }
                            const n = parseInt(s + t, 16);
                            if (isNaN(n)) {
                                return false;
                            }
                            b.push(n);
                            break;
                        }
                        case "u": {
                            const s = input.c;
                            const t = input.take(4);
                            if (t === false) {
                                return false;
                            }
                            const n = parseInt(s + t, 16);
                            if (isNaN(n)) {
                                return false;
                            }
                            const chunk = new Uint8Array(4);
                            const view = new DataView(chunk.buffer);
                            view.setInt32(0, n, true);
                            b.push(chunk[0], chunk[1], chunk[2], chunk[3]);
                            break;
                        }
                        case "U": {
                            const s = input.c;
                            const t = input.take(8);
                            if (t === false) {
                                return false;
                            }
                            const tc = proto_int64_js_1.protoInt64.uEnc(s + t);
                            const chunk = new Uint8Array(8);
                            const view = new DataView(chunk.buffer);
                            view.setInt32(0, tc.lo, true);
                            view.setInt32(4, tc.hi, true);
                            b.push(chunk[0], chunk[1], chunk[2], chunk[3], chunk[4], chunk[5], chunk[6], chunk[7]);
                            break;
                        }
                    }
                }
                break;
            default:
                b.push(input.c.charCodeAt(0));
        }
    }
    return new Uint8Array(b);
}


/***/ }),
/* 44 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createFeatureResolver = void 0;
const descriptor_pb_js_1 = __webpack_require__(42);
const proto_base64_js_1 = __webpack_require__(23);
/**
 * Return the edition feature defaults supported by @bufbuild/protobuf.
 */
function getFeatureSetDefaults(options) {
    return descriptor_pb_js_1.FeatureSetDefaults.fromBinary(proto_base64_js_1.protoBase64.dec(
    /*upstream-inject-feature-defaults-start*/ "ChMY5gciACoMCAEQAhgCIAMoATACChMY5wciACoMCAIQARgBIAIoATABChMY6AciDAgBEAEYASACKAEwASoAIOYHKOgH" /*upstream-inject-feature-defaults-end*/), options);
}
/**
 * Create an edition feature resolver with the given feature set defaults, or
 * the feature set defaults supported by @bufbuild/protobuf.
 */
function createFeatureResolver(edition, compiledFeatureSetDefaults, serializationOptions) {
    var _a;
    const fds = compiledFeatureSetDefaults !== null && compiledFeatureSetDefaults !== void 0 ? compiledFeatureSetDefaults : getFeatureSetDefaults(serializationOptions);
    const min = fds.minimumEdition;
    const max = fds.maximumEdition;
    if (min === undefined ||
        max === undefined ||
        fds.defaults.some((d) => d.edition === undefined)) {
        throw new Error("Invalid FeatureSetDefaults");
    }
    if (edition < min) {
        throw new Error(`Edition ${descriptor_pb_js_1.Edition[edition]} is earlier than the minimum supported edition ${descriptor_pb_js_1.Edition[min]}`);
    }
    if (max < edition) {
        throw new Error(`Edition ${descriptor_pb_js_1.Edition[edition]} is later than the maximum supported edition ${descriptor_pb_js_1.Edition[max]}`);
    }
    let highestMatch = undefined;
    for (const c of fds.defaults) {
        const e = (_a = c.edition) !== null && _a !== void 0 ? _a : 0;
        if (e > edition) {
            continue;
        }
        if (highestMatch !== undefined && highestMatch.e > e) {
            continue;
        }
        let f;
        if (c.fixedFeatures && c.overridableFeatures) {
            f = c.fixedFeatures;
            f.fromBinary(c.overridableFeatures.toBinary());
        }
        else if (c.fixedFeatures) {
            f = c.fixedFeatures;
        }
        else if (c.overridableFeatures) {
            f = c.overridableFeatures;
        }
        else {
            f = new descriptor_pb_js_1.FeatureSet();
        }
        highestMatch = {
            e,
            f,
        };
    }
    if (highestMatch === undefined) {
        throw new Error(`No valid default found for edition ${descriptor_pb_js_1.Edition[edition]}`);
    }
    const featureSetBin = highestMatch.f.toBinary(serializationOptions);
    return (...rest) => {
        const f = descriptor_pb_js_1.FeatureSet.fromBinary(featureSetBin, serializationOptions);
        for (const c of rest) {
            if (c !== undefined) {
                f.fromBinary(c.toBinary(serializationOptions), serializationOptions);
            }
        }
        if (!validateMergedFeatures(f)) {
            throw new Error(`Invalid FeatureSet for edition ${descriptor_pb_js_1.Edition[edition]}`);
        }
        return f;
    };
}
exports.createFeatureResolver = createFeatureResolver;
// When protoc generates google.protobuf.FeatureSetDefaults, it ensures that
// fields are not repeated or required, do not use oneof, and have a default
// value.
//
// When features for an element are resolved, features of the element and its
// parents are merged into the default FeatureSet for the edition. Because unset
// fields in the FeatureSet of an element do not unset the default FeatureSet
// values, a resolved FeatureSet is guaranteed to have all fields set. This is
// also the case for extensions to FeatureSet that a user might provide, and for
// features from the future.
//
// We cannot exhaustively validate correctness of FeatureSetDefaults at runtime
// without knowing the schema: If no value for a feature is provided, we do not
// know that it exists at all.
//
// As a sanity check, we validate that all fields known to our version of
// FeatureSet are set.
function validateMergedFeatures(featureSet) {
    for (const fi of descriptor_pb_js_1.FeatureSet.fields.list()) {
        const v = featureSet[fi.localName];
        if (v === undefined) {
            return false;
        }
        if (fi.kind == "enum" && v === 0) {
            return false;
        }
    }
    return true;
}


/***/ }),
/* 45 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createMutableRegistry = exports.createRegistry = void 0;
/**
 * Create a new registry from the given types.
 */
function createRegistry(...types) {
    const mutable = createMutableRegistry(...types);
    delete mutable.add;
    return mutable;
}
exports.createRegistry = createRegistry;
/**
 * Create a mutable registry from the given types.
 */
function createMutableRegistry(...types) {
    const messages = {};
    const enums = {};
    const services = {};
    const extensionsByName = new Map();
    const extensionsByExtendee = new Map();
    const registry = {
        findMessage(typeName) {
            return messages[typeName];
        },
        findEnum(typeName) {
            return enums[typeName];
        },
        findService(typeName) {
            return services[typeName];
        },
        findExtensionFor(typeName, no) {
            var _a, _b;
            return (_b = (_a = extensionsByExtendee.get(typeName)) === null || _a === void 0 ? void 0 : _a.get(no)) !== null && _b !== void 0 ? _b : undefined;
        },
        findExtension(typeName) {
            var _a;
            return (_a = extensionsByName.get(typeName)) !== null && _a !== void 0 ? _a : undefined;
        },
        add(type) {
            var _a;
            if ("fields" in type) {
                if (!this.findMessage(type.typeName)) {
                    messages[type.typeName] = type;
                    type.fields.list().forEach(addField);
                }
            }
            else if ("methods" in type) {
                if (!this.findService(type.typeName)) {
                    services[type.typeName] = type;
                    for (const method of Object.values(type.methods)) {
                        this.add(method.I);
                        this.add(method.O);
                    }
                }
            }
            else if ("extendee" in type) {
                if (!extensionsByName.has(type.typeName)) {
                    extensionsByName.set(type.typeName, type);
                    const extendeeName = type.extendee.typeName;
                    if (!extensionsByExtendee.has(extendeeName)) {
                        extensionsByExtendee.set(extendeeName, new Map());
                    }
                    (_a = extensionsByExtendee.get(extendeeName)) === null || _a === void 0 ? void 0 : _a.set(type.field.no, type);
                    this.add(type.extendee);
                    addField(type.field);
                }
            }
            else {
                enums[type.typeName] = type;
            }
        },
    };
    function addField(field) {
        if (field.kind == "message") {
            registry.add(field.T);
        }
        else if (field.kind == "map" && field.V.kind == "message") {
            registry.add(field.V.T);
        }
        else if (field.kind == "enum") {
            registry.add(field.T);
        }
    }
    for (const type of types) {
        registry.add(type);
    }
    return registry;
}
exports.createMutableRegistry = createMutableRegistry;


/***/ }),
/* 46 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createRegistryFromDescriptors = void 0;
const assert_js_1 = __webpack_require__(14);
const proto3_js_1 = __webpack_require__(11);
const proto2_js_1 = __webpack_require__(35);
const names_js_1 = __webpack_require__(34);
const timestamp_pb_js_1 = __webpack_require__(47);
const duration_pb_js_1 = __webpack_require__(48);
const any_pb_js_1 = __webpack_require__(49);
const empty_pb_js_1 = __webpack_require__(50);
const field_mask_pb_js_1 = __webpack_require__(51);
const struct_pb_js_1 = __webpack_require__(52);
const enum_js_1 = __webpack_require__(13);
const wrappers_pb_js_1 = __webpack_require__(53);
const descriptor_pb_js_1 = __webpack_require__(42);
const create_descriptor_set_js_1 = __webpack_require__(41);
const is_message_js_1 = __webpack_require__(27);
// well-known message types with specialized JSON representation
const wkMessages = [
    any_pb_js_1.Any,
    duration_pb_js_1.Duration,
    empty_pb_js_1.Empty,
    field_mask_pb_js_1.FieldMask,
    struct_pb_js_1.Struct,
    struct_pb_js_1.Value,
    struct_pb_js_1.ListValue,
    timestamp_pb_js_1.Timestamp,
    duration_pb_js_1.Duration,
    wrappers_pb_js_1.DoubleValue,
    wrappers_pb_js_1.FloatValue,
    wrappers_pb_js_1.Int64Value,
    wrappers_pb_js_1.Int32Value,
    wrappers_pb_js_1.UInt32Value,
    wrappers_pb_js_1.UInt64Value,
    wrappers_pb_js_1.BoolValue,
    wrappers_pb_js_1.StringValue,
    wrappers_pb_js_1.BytesValue,
];
// well-known enum types with specialized JSON representation
const wkEnums = [(0, enum_js_1.getEnumType)(struct_pb_js_1.NullValue)];
/**
 * Create a registry from a set of descriptors. The types returned by this
 * registry behave exactly like types from generated code.
 *
 * This function accepts google.protobuf.FileDescriptorSet in serialized or
 * deserialized form. Alternatively, it also accepts a DescriptorSet (see
 * createDescriptorSet()).
 *
 * By default, all well-known types with a specialized JSON representation
 * are replaced with their generated counterpart in this package.
 */
function createRegistryFromDescriptors(input, replaceWkt = true) {
    const set = input instanceof Uint8Array || (0, is_message_js_1.isMessage)(input, descriptor_pb_js_1.FileDescriptorSet)
        ? (0, create_descriptor_set_js_1.createDescriptorSet)(input)
        : input;
    const enums = new Map();
    const messages = new Map();
    const extensions = new Map();
    const extensionsByExtendee = new Map();
    const services = {};
    if (replaceWkt) {
        for (const mt of wkMessages) {
            messages.set(mt.typeName, mt);
        }
        for (const et of wkEnums) {
            enums.set(et.typeName, et);
        }
    }
    return {
        /**
         * May raise an error on invalid descriptors.
         */
        findEnum(typeName) {
            const existing = enums.get(typeName);
            if (existing) {
                return existing;
            }
            const desc = set.enums.get(typeName);
            if (!desc) {
                return undefined;
            }
            const runtime = desc.file.syntax == "proto3" ? proto3_js_1.proto3 : proto2_js_1.proto2;
            const type = runtime.makeEnumType(typeName, desc.values.map((u) => ({
                no: u.number,
                name: u.name,
                localName: (0, names_js_1.localName)(u),
            })), {});
            enums.set(typeName, type);
            return type;
        },
        /**
         * May raise an error on invalid descriptors.
         */
        findMessage(typeName) {
            const existing = messages.get(typeName);
            if (existing) {
                return existing;
            }
            const desc = set.messages.get(typeName);
            if (!desc) {
                return undefined;
            }
            const runtime = desc.file.syntax == "proto3" ? proto3_js_1.proto3 : proto2_js_1.proto2;
            const fields = [];
            const type = runtime.makeMessageType(typeName, () => fields, {
                localName: (0, names_js_1.localName)(desc),
            });
            messages.set(typeName, type);
            for (const field of desc.fields) {
                fields.push(makeFieldInfo(field, this));
            }
            return type;
        },
        /**
         * May raise an error on invalid descriptors.
         */
        findService(typeName) {
            const existing = services[typeName];
            if (existing) {
                return existing;
            }
            const desc = set.services.get(typeName);
            if (!desc) {
                return undefined;
            }
            const methods = {};
            for (const method of desc.methods) {
                const I = resolve(method.input, this, method);
                const O = resolve(method.output, this, method);
                methods[(0, names_js_1.localName)(method)] = {
                    name: method.name,
                    I,
                    O,
                    kind: method.methodKind,
                    idempotency: method.idempotency,
                    // We do not surface options at this time
                    // options: {},
                };
            }
            return (services[typeName] = {
                typeName: desc.typeName,
                methods,
            });
        },
        /**
         * May raise an error on invalid descriptors.
         */
        findExtensionFor(typeName, no) {
            var _a;
            if (!set.messages.has(typeName)) {
                return undefined;
            }
            let extensionsByNo = extensionsByExtendee.get(typeName);
            if (!extensionsByNo) {
                // maintain a lookup for extension desc by number
                extensionsByNo = new Map();
                extensionsByExtendee.set(typeName, extensionsByNo);
                for (const desc of set.extensions.values()) {
                    if (desc.extendee.typeName == typeName) {
                        extensionsByNo.set(desc.number, desc);
                    }
                }
            }
            const desc = (_a = extensionsByExtendee.get(typeName)) === null || _a === void 0 ? void 0 : _a.get(no);
            return desc ? this.findExtension(desc.typeName) : undefined;
        },
        /**
         * May raise an error on invalid descriptors.
         */
        findExtension(typeName) {
            const existing = extensions.get(typeName);
            if (existing) {
                return existing;
            }
            const desc = set.extensions.get(typeName);
            if (!desc) {
                return undefined;
            }
            const extendee = resolve(desc.extendee, this, desc);
            const runtime = desc.file.syntax == "proto3" ? proto3_js_1.proto3 : proto2_js_1.proto2;
            const ext = runtime.makeExtension(typeName, extendee, makeFieldInfo(desc, this));
            extensions.set(typeName, ext);
            return ext;
        },
    };
}
exports.createRegistryFromDescriptors = createRegistryFromDescriptors;
function makeFieldInfo(desc, registry) {
    var _a;
    const f = {
        kind: desc.fieldKind,
        no: desc.number,
        name: desc.name,
        jsonName: desc.jsonName,
        delimited: desc.proto.type == descriptor_pb_js_1.FieldDescriptorProto_Type.GROUP,
        repeated: desc.repeated,
        packed: desc.packed,
        oneof: (_a = desc.oneof) === null || _a === void 0 ? void 0 : _a.name,
        opt: desc.optional,
        req: desc.proto.label === descriptor_pb_js_1.FieldDescriptorProto_Label.REQUIRED,
    };
    switch (desc.fieldKind) {
        case "map": {
            (0, assert_js_1.assert)(desc.kind == "field"); // maps are not allowed for extensions
            let T;
            switch (desc.mapValue.kind) {
                case "scalar":
                    T = desc.mapValue.scalar;
                    break;
                case "enum": {
                    T = resolve(desc.mapValue.enum, registry, desc);
                    break;
                }
                case "message": {
                    T = resolve(desc.mapValue.message, registry, desc);
                    break;
                }
            }
            f.K = desc.mapKey;
            f.V = {
                kind: desc.mapValue.kind,
                T,
            };
            break;
        }
        case "message": {
            f.T = resolve(desc.message, registry, desc);
            break;
        }
        case "enum": {
            f.T = resolve(desc.enum, registry, desc);
            f.default = desc.getDefaultValue();
            break;
        }
        case "scalar": {
            f.L = desc.longType;
            f.T = desc.scalar;
            f.default = desc.getDefaultValue();
            break;
        }
    }
    return f;
}
function resolve(desc, registry, context) {
    const type = desc.kind == "message"
        ? registry.findMessage(desc.typeName)
        : registry.findEnum(desc.typeName);
    (0, assert_js_1.assert)(type, `${desc.toString()}" for ${context.toString()} not found`);
    return type;
}


/***/ }),
/* 47 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Timestamp = void 0;
const message_js_1 = __webpack_require__(16);
const proto_int64_js_1 = __webpack_require__(19);
const proto3_js_1 = __webpack_require__(11);
/**
 * A Timestamp represents a point in time independent of any time zone or local
 * calendar, encoded as a count of seconds and fractions of seconds at
 * nanosecond resolution. The count is relative to an epoch at UTC midnight on
 * January 1, 1970, in the proleptic Gregorian calendar which extends the
 * Gregorian calendar backwards to year one.
 *
 * All minutes are 60 seconds long. Leap seconds are "smeared" so that no leap
 * second table is needed for interpretation, using a [24-hour linear
 * smear](https://developers.google.com/time/smear).
 *
 * The range is from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59.999999999Z. By
 * restricting to that range, we ensure that we can convert to and from [RFC
 * 3339](https://www.ietf.org/rfc/rfc3339.txt) date strings.
 *
 * # Examples
 *
 * Example 1: Compute Timestamp from POSIX `time()`.
 *
 *     Timestamp timestamp;
 *     timestamp.set_seconds(time(NULL));
 *     timestamp.set_nanos(0);
 *
 * Example 2: Compute Timestamp from POSIX `gettimeofday()`.
 *
 *     struct timeval tv;
 *     gettimeofday(&tv, NULL);
 *
 *     Timestamp timestamp;
 *     timestamp.set_seconds(tv.tv_sec);
 *     timestamp.set_nanos(tv.tv_usec * 1000);
 *
 * Example 3: Compute Timestamp from Win32 `GetSystemTimeAsFileTime()`.
 *
 *     FILETIME ft;
 *     GetSystemTimeAsFileTime(&ft);
 *     UINT64 ticks = (((UINT64)ft.dwHighDateTime) << 32) | ft.dwLowDateTime;
 *
 *     // A Windows tick is 100 nanoseconds. Windows epoch 1601-01-01T00:00:00Z
 *     // is 11644473600 seconds before Unix epoch 1970-01-01T00:00:00Z.
 *     Timestamp timestamp;
 *     timestamp.set_seconds((INT64) ((ticks / 10000000) - 11644473600LL));
 *     timestamp.set_nanos((INT32) ((ticks % 10000000) * 100));
 *
 * Example 4: Compute Timestamp from Java `System.currentTimeMillis()`.
 *
 *     long millis = System.currentTimeMillis();
 *
 *     Timestamp timestamp = Timestamp.newBuilder().setSeconds(millis / 1000)
 *         .setNanos((int) ((millis % 1000) * 1000000)).build();
 *
 * Example 5: Compute Timestamp from Java `Instant.now()`.
 *
 *     Instant now = Instant.now();
 *
 *     Timestamp timestamp =
 *         Timestamp.newBuilder().setSeconds(now.getEpochSecond())
 *             .setNanos(now.getNano()).build();
 *
 * Example 6: Compute Timestamp from current time in Python.
 *
 *     timestamp = Timestamp()
 *     timestamp.GetCurrentTime()
 *
 * # JSON Mapping
 *
 * In JSON format, the Timestamp type is encoded as a string in the
 * [RFC 3339](https://www.ietf.org/rfc/rfc3339.txt) format. That is, the
 * format is "{year}-{month}-{day}T{hour}:{min}:{sec}[.{frac_sec}]Z"
 * where {year} is always expressed using four digits while {month}, {day},
 * {hour}, {min}, and {sec} are zero-padded to two digits each. The fractional
 * seconds, which can go up to 9 digits (i.e. up to 1 nanosecond resolution),
 * are optional. The "Z" suffix indicates the timezone ("UTC"); the timezone
 * is required. A proto3 JSON serializer should always use UTC (as indicated by
 * "Z") when printing the Timestamp type and a proto3 JSON parser should be
 * able to accept both UTC and other timezones (as indicated by an offset).
 *
 * For example, "2017-01-15T01:30:15.01Z" encodes 15.01 seconds past
 * 01:30 UTC on January 15, 2017.
 *
 * In JavaScript, one can convert a Date object to this format using the
 * standard
 * [toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
 * method. In Python, a standard `datetime.datetime` object can be converted
 * to this format using
 * [`strftime`](https://docs.python.org/2/library/time.html#time.strftime) with
 * the time format spec '%Y-%m-%dT%H:%M:%S.%fZ'. Likewise, in Java, one can use
 * the Joda Time's [`ISODateTimeFormat.dateTime()`](
 * http://joda-time.sourceforge.net/apidocs/org/joda/time/format/ISODateTimeFormat.html#dateTime()
 * ) to obtain a formatter capable of generating timestamps in this format.
 *
 *
 * @generated from message google.protobuf.Timestamp
 */
class Timestamp extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * Represents seconds of UTC time since Unix epoch
         * 1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
         * 9999-12-31T23:59:59Z inclusive.
         *
         * @generated from field: int64 seconds = 1;
         */
        this.seconds = proto_int64_js_1.protoInt64.zero;
        /**
         * Non-negative fractions of a second at nanosecond resolution. Negative
         * second values with fractions must still have non-negative nanos values
         * that count forward in time. Must be from 0 to 999,999,999
         * inclusive.
         *
         * @generated from field: int32 nanos = 2;
         */
        this.nanos = 0;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    fromJson(json, options) {
        if (typeof json !== "string") {
            throw new Error(`cannot decode google.protobuf.Timestamp from JSON: ${proto3_js_1.proto3.json.debug(json)}`);
        }
        const matches = json.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:Z|\.([0-9]{3,9})Z|([+-][0-9][0-9]:[0-9][0-9]))$/);
        if (!matches) {
            throw new Error(`cannot decode google.protobuf.Timestamp from JSON: invalid RFC 3339 string`);
        }
        const ms = Date.parse(matches[1] + "-" + matches[2] + "-" + matches[3] + "T" + matches[4] + ":" + matches[5] + ":" + matches[6] + (matches[8] ? matches[8] : "Z"));
        if (Number.isNaN(ms)) {
            throw new Error(`cannot decode google.protobuf.Timestamp from JSON: invalid RFC 3339 string`);
        }
        if (ms < Date.parse("0001-01-01T00:00:00Z") || ms > Date.parse("9999-12-31T23:59:59Z")) {
            throw new Error(`cannot decode message google.protobuf.Timestamp from JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`);
        }
        this.seconds = proto_int64_js_1.protoInt64.parse(ms / 1000);
        this.nanos = 0;
        if (matches[7]) {
            this.nanos = (parseInt("1" + matches[7] + "0".repeat(9 - matches[7].length)) - 1000000000);
        }
        return this;
    }
    toJson(options) {
        const ms = Number(this.seconds) * 1000;
        if (ms < Date.parse("0001-01-01T00:00:00Z") || ms > Date.parse("9999-12-31T23:59:59Z")) {
            throw new Error(`cannot encode google.protobuf.Timestamp to JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`);
        }
        if (this.nanos < 0) {
            throw new Error(`cannot encode google.protobuf.Timestamp to JSON: nanos must not be negative`);
        }
        let z = "Z";
        if (this.nanos > 0) {
            const nanosStr = (this.nanos + 1000000000).toString().substring(1);
            if (nanosStr.substring(3) === "000000") {
                z = "." + nanosStr.substring(0, 3) + "Z";
            }
            else if (nanosStr.substring(6) === "000") {
                z = "." + nanosStr.substring(0, 6) + "Z";
            }
            else {
                z = "." + nanosStr + "Z";
            }
        }
        return new Date(ms).toISOString().replace(".000Z", z);
    }
    toDate() {
        return new Date(Number(this.seconds) * 1000 + Math.ceil(this.nanos / 1000000));
    }
    static now() {
        return Timestamp.fromDate(new Date());
    }
    static fromDate(date) {
        const ms = date.getTime();
        return new Timestamp({
            seconds: proto_int64_js_1.protoInt64.parse(Math.floor(ms / 1000)),
            nanos: (ms % 1000) * 1000000,
        });
    }
    static fromBinary(bytes, options) {
        return new Timestamp().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Timestamp().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Timestamp().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Timestamp, a, b);
    }
}
exports.Timestamp = Timestamp;
Timestamp.runtime = proto3_js_1.proto3;
Timestamp.typeName = "google.protobuf.Timestamp";
Timestamp.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "seconds", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
    { no: 2, name: "nanos", kind: "scalar", T: 5 /* ScalarType.INT32 */ },
]);


/***/ }),
/* 48 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Duration = void 0;
const message_js_1 = __webpack_require__(16);
const proto_int64_js_1 = __webpack_require__(19);
const proto3_js_1 = __webpack_require__(11);
/**
 * A Duration represents a signed, fixed-length span of time represented
 * as a count of seconds and fractions of seconds at nanosecond
 * resolution. It is independent of any calendar and concepts like "day"
 * or "month". It is related to Timestamp in that the difference between
 * two Timestamp values is a Duration and it can be added or subtracted
 * from a Timestamp. Range is approximately +-10,000 years.
 *
 * # Examples
 *
 * Example 1: Compute Duration from two Timestamps in pseudo code.
 *
 *     Timestamp start = ...;
 *     Timestamp end = ...;
 *     Duration duration = ...;
 *
 *     duration.seconds = end.seconds - start.seconds;
 *     duration.nanos = end.nanos - start.nanos;
 *
 *     if (duration.seconds < 0 && duration.nanos > 0) {
 *       duration.seconds += 1;
 *       duration.nanos -= 1000000000;
 *     } else if (duration.seconds > 0 && duration.nanos < 0) {
 *       duration.seconds -= 1;
 *       duration.nanos += 1000000000;
 *     }
 *
 * Example 2: Compute Timestamp from Timestamp + Duration in pseudo code.
 *
 *     Timestamp start = ...;
 *     Duration duration = ...;
 *     Timestamp end = ...;
 *
 *     end.seconds = start.seconds + duration.seconds;
 *     end.nanos = start.nanos + duration.nanos;
 *
 *     if (end.nanos < 0) {
 *       end.seconds -= 1;
 *       end.nanos += 1000000000;
 *     } else if (end.nanos >= 1000000000) {
 *       end.seconds += 1;
 *       end.nanos -= 1000000000;
 *     }
 *
 * Example 3: Compute Duration from datetime.timedelta in Python.
 *
 *     td = datetime.timedelta(days=3, minutes=10)
 *     duration = Duration()
 *     duration.FromTimedelta(td)
 *
 * # JSON Mapping
 *
 * In JSON format, the Duration type is encoded as a string rather than an
 * object, where the string ends in the suffix "s" (indicating seconds) and
 * is preceded by the number of seconds, with nanoseconds expressed as
 * fractional seconds. For example, 3 seconds with 0 nanoseconds should be
 * encoded in JSON format as "3s", while 3 seconds and 1 nanosecond should
 * be expressed in JSON format as "3.000000001s", and 3 seconds and 1
 * microsecond should be expressed in JSON format as "3.000001s".
 *
 *
 * @generated from message google.protobuf.Duration
 */
class Duration extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * Signed seconds of the span of time. Must be from -315,576,000,000
         * to +315,576,000,000 inclusive. Note: these bounds are computed from:
         * 60 sec/min * 60 min/hr * 24 hr/day * 365.25 days/year * 10000 years
         *
         * @generated from field: int64 seconds = 1;
         */
        this.seconds = proto_int64_js_1.protoInt64.zero;
        /**
         * Signed fractions of a second at nanosecond resolution of the span
         * of time. Durations less than one second are represented with a 0
         * `seconds` field and a positive or negative `nanos` field. For durations
         * of one second or more, a non-zero value for the `nanos` field must be
         * of the same sign as the `seconds` field. Must be from -999,999,999
         * to +999,999,999 inclusive.
         *
         * @generated from field: int32 nanos = 2;
         */
        this.nanos = 0;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    fromJson(json, options) {
        if (typeof json !== "string") {
            throw new Error(`cannot decode google.protobuf.Duration from JSON: ${proto3_js_1.proto3.json.debug(json)}`);
        }
        const match = json.match(/^(-?[0-9]+)(?:\.([0-9]+))?s/);
        if (match === null) {
            throw new Error(`cannot decode google.protobuf.Duration from JSON: ${proto3_js_1.proto3.json.debug(json)}`);
        }
        const longSeconds = Number(match[1]);
        if (longSeconds > 315576000000 || longSeconds < -315576000000) {
            throw new Error(`cannot decode google.protobuf.Duration from JSON: ${proto3_js_1.proto3.json.debug(json)}`);
        }
        this.seconds = proto_int64_js_1.protoInt64.parse(longSeconds);
        if (typeof match[2] == "string") {
            const nanosStr = match[2] + "0".repeat(9 - match[2].length);
            this.nanos = parseInt(nanosStr);
            if (longSeconds < 0 || Object.is(longSeconds, -0)) {
                this.nanos = -this.nanos;
            }
        }
        return this;
    }
    toJson(options) {
        if (Number(this.seconds) > 315576000000 || Number(this.seconds) < -315576000000) {
            throw new Error(`cannot encode google.protobuf.Duration to JSON: value out of range`);
        }
        let text = this.seconds.toString();
        if (this.nanos !== 0) {
            let nanosStr = Math.abs(this.nanos).toString();
            nanosStr = "0".repeat(9 - nanosStr.length) + nanosStr;
            if (nanosStr.substring(3) === "000000") {
                nanosStr = nanosStr.substring(0, 3);
            }
            else if (nanosStr.substring(6) === "000") {
                nanosStr = nanosStr.substring(0, 6);
            }
            text += "." + nanosStr;
            if (this.nanos < 0 && Number(this.seconds) == 0) {
                text = "-" + text;
            }
        }
        return text + "s";
    }
    static fromBinary(bytes, options) {
        return new Duration().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Duration().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Duration().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Duration, a, b);
    }
}
exports.Duration = Duration;
Duration.runtime = proto3_js_1.proto3;
Duration.typeName = "google.protobuf.Duration";
Duration.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "seconds", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
    { no: 2, name: "nanos", kind: "scalar", T: 5 /* ScalarType.INT32 */ },
]);


/***/ }),
/* 49 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Any = void 0;
const message_js_1 = __webpack_require__(16);
const proto3_js_1 = __webpack_require__(11);
/**
 * `Any` contains an arbitrary serialized protocol buffer message along with a
 * URL that describes the type of the serialized message.
 *
 * Protobuf library provides support to pack/unpack Any values in the form
 * of utility functions or additional generated methods of the Any type.
 *
 * Example 1: Pack and unpack a message in C++.
 *
 *     Foo foo = ...;
 *     Any any;
 *     any.PackFrom(foo);
 *     ...
 *     if (any.UnpackTo(&foo)) {
 *       ...
 *     }
 *
 * Example 2: Pack and unpack a message in Java.
 *
 *     Foo foo = ...;
 *     Any any = Any.pack(foo);
 *     ...
 *     if (any.is(Foo.class)) {
 *       foo = any.unpack(Foo.class);
 *     }
 *     // or ...
 *     if (any.isSameTypeAs(Foo.getDefaultInstance())) {
 *       foo = any.unpack(Foo.getDefaultInstance());
 *     }
 *
 *  Example 3: Pack and unpack a message in Python.
 *
 *     foo = Foo(...)
 *     any = Any()
 *     any.Pack(foo)
 *     ...
 *     if any.Is(Foo.DESCRIPTOR):
 *       any.Unpack(foo)
 *       ...
 *
 *  Example 4: Pack and unpack a message in Go
 *
 *      foo := &pb.Foo{...}
 *      any, err := anypb.New(foo)
 *      if err != nil {
 *        ...
 *      }
 *      ...
 *      foo := &pb.Foo{}
 *      if err := any.UnmarshalTo(foo); err != nil {
 *        ...
 *      }
 *
 * The pack methods provided by protobuf library will by default use
 * 'type.googleapis.com/full.type.name' as the type URL and the unpack
 * methods only use the fully qualified type name after the last '/'
 * in the type URL, for example "foo.bar.com/x/y.z" will yield type
 * name "y.z".
 *
 * JSON
 * ====
 * The JSON representation of an `Any` value uses the regular
 * representation of the deserialized, embedded message, with an
 * additional field `@type` which contains the type URL. Example:
 *
 *     package google.profile;
 *     message Person {
 *       string first_name = 1;
 *       string last_name = 2;
 *     }
 *
 *     {
 *       "@type": "type.googleapis.com/google.profile.Person",
 *       "firstName": <string>,
 *       "lastName": <string>
 *     }
 *
 * If the embedded message type is well-known and has a custom JSON
 * representation, that representation will be embedded adding a field
 * `value` which holds the custom JSON in addition to the `@type`
 * field. Example (for message [google.protobuf.Duration][]):
 *
 *     {
 *       "@type": "type.googleapis.com/google.protobuf.Duration",
 *       "value": "1.212s"
 *     }
 *
 *
 * @generated from message google.protobuf.Any
 */
class Any extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * A URL/resource name that uniquely identifies the type of the serialized
         * protocol buffer message. This string must contain at least
         * one "/" character. The last segment of the URL's path must represent
         * the fully qualified name of the type (as in
         * `path/google.protobuf.Duration`). The name should be in a canonical form
         * (e.g., leading "." is not accepted).
         *
         * In practice, teams usually precompile into the binary all types that they
         * expect it to use in the context of Any. However, for URLs which use the
         * scheme `http`, `https`, or no scheme, one can optionally set up a type
         * server that maps type URLs to message definitions as follows:
         *
         * * If no scheme is provided, `https` is assumed.
         * * An HTTP GET on the URL must yield a [google.protobuf.Type][]
         *   value in binary format, or produce an error.
         * * Applications are allowed to cache lookup results based on the
         *   URL, or have them precompiled into a binary to avoid any
         *   lookup. Therefore, binary compatibility needs to be preserved
         *   on changes to types. (Use versioned type names to manage
         *   breaking changes.)
         *
         * Note: this functionality is not currently available in the official
         * protobuf release, and it is not used for type URLs beginning with
         * type.googleapis.com. As of May 2023, there are no widely used type server
         * implementations and no plans to implement one.
         *
         * Schemes other than `http`, `https` (or the empty scheme) might be
         * used with implementation specific semantics.
         *
         *
         * @generated from field: string type_url = 1;
         */
        this.typeUrl = "";
        /**
         * Must be a valid serialized protocol buffer of the above specified type.
         *
         * @generated from field: bytes value = 2;
         */
        this.value = new Uint8Array(0);
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        var _a;
        if (this.typeUrl === "") {
            return {};
        }
        const typeName = this.typeUrlToName(this.typeUrl);
        const messageType = (_a = options === null || options === void 0 ? void 0 : options.typeRegistry) === null || _a === void 0 ? void 0 : _a.findMessage(typeName);
        if (!messageType) {
            throw new Error(`cannot encode message google.protobuf.Any to JSON: "${this.typeUrl}" is not in the type registry`);
        }
        const message = messageType.fromBinary(this.value);
        let json = message.toJson(options);
        if (typeName.startsWith("google.protobuf.") || (json === null || Array.isArray(json) || typeof json !== "object")) {
            json = { value: json };
        }
        json["@type"] = this.typeUrl;
        return json;
    }
    fromJson(json, options) {
        var _a;
        if (json === null || Array.isArray(json) || typeof json != "object") {
            throw new Error(`cannot decode message google.protobuf.Any from JSON: expected object but got ${json === null ? "null" : Array.isArray(json) ? "array" : typeof json}`);
        }
        if (Object.keys(json).length == 0) {
            return this;
        }
        const typeUrl = json["@type"];
        if (typeof typeUrl != "string" || typeUrl == "") {
            throw new Error(`cannot decode message google.protobuf.Any from JSON: "@type" is empty`);
        }
        const typeName = this.typeUrlToName(typeUrl), messageType = (_a = options === null || options === void 0 ? void 0 : options.typeRegistry) === null || _a === void 0 ? void 0 : _a.findMessage(typeName);
        if (!messageType) {
            throw new Error(`cannot decode message google.protobuf.Any from JSON: ${typeUrl} is not in the type registry`);
        }
        let message;
        if (typeName.startsWith("google.protobuf.") && Object.prototype.hasOwnProperty.call(json, "value")) {
            message = messageType.fromJson(json["value"], options);
        }
        else {
            const copy = Object.assign({}, json);
            delete copy["@type"];
            message = messageType.fromJson(copy, options);
        }
        this.packFrom(message);
        return this;
    }
    packFrom(message) {
        this.value = message.toBinary();
        this.typeUrl = this.typeNameToUrl(message.getType().typeName);
    }
    unpackTo(target) {
        if (!this.is(target.getType())) {
            return false;
        }
        target.fromBinary(this.value);
        return true;
    }
    unpack(registry) {
        if (this.typeUrl === "") {
            return undefined;
        }
        const messageType = registry.findMessage(this.typeUrlToName(this.typeUrl));
        if (!messageType) {
            return undefined;
        }
        return messageType.fromBinary(this.value);
    }
    is(type) {
        if (this.typeUrl === '') {
            return false;
        }
        const name = this.typeUrlToName(this.typeUrl);
        let typeName = '';
        if (typeof type === 'string') {
            typeName = type;
        }
        else {
            typeName = type.typeName;
        }
        return name === typeName;
    }
    typeNameToUrl(name) {
        return `type.googleapis.com/${name}`;
    }
    typeUrlToName(url) {
        if (!url.length) {
            throw new Error(`invalid type url: ${url}`);
        }
        const slash = url.lastIndexOf("/");
        const name = slash >= 0 ? url.substring(slash + 1) : url;
        if (!name.length) {
            throw new Error(`invalid type url: ${url}`);
        }
        return name;
    }
    static pack(message) {
        const any = new Any();
        any.packFrom(message);
        return any;
    }
    static fromBinary(bytes, options) {
        return new Any().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Any().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Any().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Any, a, b);
    }
}
exports.Any = Any;
Any.runtime = proto3_js_1.proto3;
Any.typeName = "google.protobuf.Any";
Any.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "type_url", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "value", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
]);


/***/ }),
/* 50 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Empty = void 0;
const message_js_1 = __webpack_require__(16);
const proto3_js_1 = __webpack_require__(11);
/**
 * A generic empty message that you can re-use to avoid defining duplicated
 * empty messages in your APIs. A typical example is to use it as the request
 * or the response type of an API method. For instance:
 *
 *     service Foo {
 *       rpc Bar(google.protobuf.Empty) returns (google.protobuf.Empty);
 *     }
 *
 *
 * @generated from message google.protobuf.Empty
 */
class Empty extends message_js_1.Message {
    constructor(data) {
        super();
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new Empty().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Empty().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Empty().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Empty, a, b);
    }
}
exports.Empty = Empty;
Empty.runtime = proto3_js_1.proto3;
Empty.typeName = "google.protobuf.Empty";
Empty.fields = proto3_js_1.proto3.util.newFieldList(() => []);


/***/ }),
/* 51 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FieldMask = void 0;
const message_js_1 = __webpack_require__(16);
const proto3_js_1 = __webpack_require__(11);
/**
 * `FieldMask` represents a set of symbolic field paths, for example:
 *
 *     paths: "f.a"
 *     paths: "f.b.d"
 *
 * Here `f` represents a field in some root message, `a` and `b`
 * fields in the message found in `f`, and `d` a field found in the
 * message in `f.b`.
 *
 * Field masks are used to specify a subset of fields that should be
 * returned by a get operation or modified by an update operation.
 * Field masks also have a custom JSON encoding (see below).
 *
 * # Field Masks in Projections
 *
 * When used in the context of a projection, a response message or
 * sub-message is filtered by the API to only contain those fields as
 * specified in the mask. For example, if the mask in the previous
 * example is applied to a response message as follows:
 *
 *     f {
 *       a : 22
 *       b {
 *         d : 1
 *         x : 2
 *       }
 *       y : 13
 *     }
 *     z: 8
 *
 * The result will not contain specific values for fields x,y and z
 * (their value will be set to the default, and omitted in proto text
 * output):
 *
 *
 *     f {
 *       a : 22
 *       b {
 *         d : 1
 *       }
 *     }
 *
 * A repeated field is not allowed except at the last position of a
 * paths string.
 *
 * If a FieldMask object is not present in a get operation, the
 * operation applies to all fields (as if a FieldMask of all fields
 * had been specified).
 *
 * Note that a field mask does not necessarily apply to the
 * top-level response message. In case of a REST get operation, the
 * field mask applies directly to the response, but in case of a REST
 * list operation, the mask instead applies to each individual message
 * in the returned resource list. In case of a REST custom method,
 * other definitions may be used. Where the mask applies will be
 * clearly documented together with its declaration in the API.  In
 * any case, the effect on the returned resource/resources is required
 * behavior for APIs.
 *
 * # Field Masks in Update Operations
 *
 * A field mask in update operations specifies which fields of the
 * targeted resource are going to be updated. The API is required
 * to only change the values of the fields as specified in the mask
 * and leave the others untouched. If a resource is passed in to
 * describe the updated values, the API ignores the values of all
 * fields not covered by the mask.
 *
 * If a repeated field is specified for an update operation, new values will
 * be appended to the existing repeated field in the target resource. Note that
 * a repeated field is only allowed in the last position of a `paths` string.
 *
 * If a sub-message is specified in the last position of the field mask for an
 * update operation, then new value will be merged into the existing sub-message
 * in the target resource.
 *
 * For example, given the target message:
 *
 *     f {
 *       b {
 *         d: 1
 *         x: 2
 *       }
 *       c: [1]
 *     }
 *
 * And an update message:
 *
 *     f {
 *       b {
 *         d: 10
 *       }
 *       c: [2]
 *     }
 *
 * then if the field mask is:
 *
 *  paths: ["f.b", "f.c"]
 *
 * then the result will be:
 *
 *     f {
 *       b {
 *         d: 10
 *         x: 2
 *       }
 *       c: [1, 2]
 *     }
 *
 * An implementation may provide options to override this default behavior for
 * repeated and message fields.
 *
 * In order to reset a field's value to the default, the field must
 * be in the mask and set to the default value in the provided resource.
 * Hence, in order to reset all fields of a resource, provide a default
 * instance of the resource and set all fields in the mask, or do
 * not provide a mask as described below.
 *
 * If a field mask is not present on update, the operation applies to
 * all fields (as if a field mask of all fields has been specified).
 * Note that in the presence of schema evolution, this may mean that
 * fields the client does not know and has therefore not filled into
 * the request will be reset to their default. If this is unwanted
 * behavior, a specific service may require a client to always specify
 * a field mask, producing an error if not.
 *
 * As with get operations, the location of the resource which
 * describes the updated values in the request message depends on the
 * operation kind. In any case, the effect of the field mask is
 * required to be honored by the API.
 *
 * ## Considerations for HTTP REST
 *
 * The HTTP kind of an update operation which uses a field mask must
 * be set to PATCH instead of PUT in order to satisfy HTTP semantics
 * (PUT must only be used for full updates).
 *
 * # JSON Encoding of Field Masks
 *
 * In JSON, a field mask is encoded as a single string where paths are
 * separated by a comma. Fields name in each path are converted
 * to/from lower-camel naming conventions.
 *
 * As an example, consider the following message declarations:
 *
 *     message Profile {
 *       User user = 1;
 *       Photo photo = 2;
 *     }
 *     message User {
 *       string display_name = 1;
 *       string address = 2;
 *     }
 *
 * In proto a field mask for `Profile` may look as such:
 *
 *     mask {
 *       paths: "user.display_name"
 *       paths: "photo"
 *     }
 *
 * In JSON, the same mask is represented as below:
 *
 *     {
 *       mask: "user.displayName,photo"
 *     }
 *
 * # Field Masks and Oneof Fields
 *
 * Field masks treat fields in oneofs just as regular fields. Consider the
 * following message:
 *
 *     message SampleMessage {
 *       oneof test_oneof {
 *         string name = 4;
 *         SubMessage sub_message = 9;
 *       }
 *     }
 *
 * The field mask can be:
 *
 *     mask {
 *       paths: "name"
 *     }
 *
 * Or:
 *
 *     mask {
 *       paths: "sub_message"
 *     }
 *
 * Note that oneof type names ("test_oneof" in this case) cannot be used in
 * paths.
 *
 * ## Field Mask Verification
 *
 * The implementation of any API method which has a FieldMask type field in the
 * request should verify the included field paths, and return an
 * `INVALID_ARGUMENT` error if any path is unmappable.
 *
 * @generated from message google.protobuf.FieldMask
 */
class FieldMask extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The set of field mask paths.
         *
         * @generated from field: repeated string paths = 1;
         */
        this.paths = [];
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        // Converts snake_case to protoCamelCase according to the convention
        // used by protoc to convert a field name to a JSON name.
        function protoCamelCase(snakeCase) {
            let capNext = false;
            const b = [];
            for (let i = 0; i < snakeCase.length; i++) {
                let c = snakeCase.charAt(i);
                switch (c) {
                    case '_':
                        capNext = true;
                        break;
                    case '0':
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                    case '5':
                    case '6':
                    case '7':
                    case '8':
                    case '9':
                        b.push(c);
                        capNext = false;
                        break;
                    default:
                        if (capNext) {
                            capNext = false;
                            c = c.toUpperCase();
                        }
                        b.push(c);
                        break;
                }
            }
            return b.join('');
        }
        return this.paths.map(p => {
            if (p.match(/_[0-9]?_/g) || p.match(/[A-Z]/g)) {
                throw new Error("cannot encode google.protobuf.FieldMask to JSON: lowerCamelCase of path name \"" + p + "\" is irreversible");
            }
            return protoCamelCase(p);
        }).join(",");
    }
    fromJson(json, options) {
        if (typeof json !== "string") {
            throw new Error("cannot decode google.protobuf.FieldMask from JSON: " + proto3_js_1.proto3.json.debug(json));
        }
        if (json === "") {
            return this;
        }
        function camelToSnake(str) {
            if (str.includes("_")) {
                throw new Error("cannot decode google.protobuf.FieldMask from JSON: path names must be lowerCamelCase");
            }
            const sc = str.replace(/[A-Z]/g, letter => "_" + letter.toLowerCase());
            return (sc[0] === "_") ? sc.substring(1) : sc;
        }
        this.paths = json.split(",").map(camelToSnake);
        return this;
    }
    static fromBinary(bytes, options) {
        return new FieldMask().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FieldMask().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FieldMask().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(FieldMask, a, b);
    }
}
exports.FieldMask = FieldMask;
FieldMask.runtime = proto3_js_1.proto3;
FieldMask.typeName = "google.protobuf.FieldMask";
FieldMask.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "paths", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
]);


/***/ }),
/* 52 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ListValue = exports.Value = exports.Struct = exports.NullValue = void 0;
// @generated by protoc-gen-es v1.10.1 with parameter "bootstrap_wkt=true,ts_nocheck=false,target=ts"
// @generated from file google/protobuf/struct.proto (package google.protobuf, syntax proto3)
/* eslint-disable */
const proto3_js_1 = __webpack_require__(11);
const message_js_1 = __webpack_require__(16);
/**
 * `NullValue` is a singleton enumeration to represent the null value for the
 * `Value` type union.
 *
 * The JSON representation for `NullValue` is JSON `null`.
 *
 * @generated from enum google.protobuf.NullValue
 */
var NullValue;
(function (NullValue) {
    /**
     * Null value.
     *
     * @generated from enum value: NULL_VALUE = 0;
     */
    NullValue[NullValue["NULL_VALUE"] = 0] = "NULL_VALUE";
})(NullValue || (exports.NullValue = NullValue = {}));
// Retrieve enum metadata with: proto3.getEnumType(NullValue)
proto3_js_1.proto3.util.setEnumType(NullValue, "google.protobuf.NullValue", [
    { no: 0, name: "NULL_VALUE" },
]);
/**
 * `Struct` represents a structured data value, consisting of fields
 * which map to dynamically typed values. In some languages, `Struct`
 * might be supported by a native representation. For example, in
 * scripting languages like JS a struct is represented as an
 * object. The details of that representation are described together
 * with the proto support for the language.
 *
 * The JSON representation for `Struct` is JSON object.
 *
 * @generated from message google.protobuf.Struct
 */
class Struct extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * Unordered map of dynamically typed values.
         *
         * @generated from field: map<string, google.protobuf.Value> fields = 1;
         */
        this.fields = {};
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        const json = {};
        for (const [k, v] of Object.entries(this.fields)) {
            json[k] = v.toJson(options);
        }
        return json;
    }
    fromJson(json, options) {
        if (typeof json != "object" || json == null || Array.isArray(json)) {
            throw new Error("cannot decode google.protobuf.Struct from JSON " + proto3_js_1.proto3.json.debug(json));
        }
        for (const [k, v] of Object.entries(json)) {
            this.fields[k] = Value.fromJson(v);
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new Struct().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Struct().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Struct().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Struct, a, b);
    }
}
exports.Struct = Struct;
Struct.runtime = proto3_js_1.proto3;
Struct.typeName = "google.protobuf.Struct";
Struct.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "fields", kind: "map", K: 9 /* ScalarType.STRING */, V: { kind: "message", T: Value } },
]);
/**
 * `Value` represents a dynamically typed value which can be either
 * null, a number, a string, a boolean, a recursive struct value, or a
 * list of values. A producer of value is expected to set one of these
 * variants. Absence of any variant indicates an error.
 *
 * The JSON representation for `Value` is JSON value.
 *
 * @generated from message google.protobuf.Value
 */
class Value extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The kind of value.
         *
         * @generated from oneof google.protobuf.Value.kind
         */
        this.kind = { case: undefined };
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        switch (this.kind.case) {
            case "nullValue":
                return null;
            case "numberValue":
                if (!Number.isFinite(this.kind.value)) {
                    throw new Error("google.protobuf.Value cannot be NaN or Infinity");
                }
                return this.kind.value;
            case "boolValue":
                return this.kind.value;
            case "stringValue":
                return this.kind.value;
            case "structValue":
            case "listValue":
                return this.kind.value.toJson(Object.assign(Object.assign({}, options), { emitDefaultValues: true }));
        }
        throw new Error("google.protobuf.Value must have a value");
    }
    fromJson(json, options) {
        switch (typeof json) {
            case "number":
                this.kind = { case: "numberValue", value: json };
                break;
            case "string":
                this.kind = { case: "stringValue", value: json };
                break;
            case "boolean":
                this.kind = { case: "boolValue", value: json };
                break;
            case "object":
                if (json === null) {
                    this.kind = { case: "nullValue", value: NullValue.NULL_VALUE };
                }
                else if (Array.isArray(json)) {
                    this.kind = { case: "listValue", value: ListValue.fromJson(json) };
                }
                else {
                    this.kind = { case: "structValue", value: Struct.fromJson(json) };
                }
                break;
            default:
                throw new Error("cannot decode google.protobuf.Value from JSON " + proto3_js_1.proto3.json.debug(json));
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new Value().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Value().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Value().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Value, a, b);
    }
}
exports.Value = Value;
Value.runtime = proto3_js_1.proto3;
Value.typeName = "google.protobuf.Value";
Value.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "null_value", kind: "enum", T: proto3_js_1.proto3.getEnumType(NullValue), oneof: "kind" },
    { no: 2, name: "number_value", kind: "scalar", T: 1 /* ScalarType.DOUBLE */, oneof: "kind" },
    { no: 3, name: "string_value", kind: "scalar", T: 9 /* ScalarType.STRING */, oneof: "kind" },
    { no: 4, name: "bool_value", kind: "scalar", T: 8 /* ScalarType.BOOL */, oneof: "kind" },
    { no: 5, name: "struct_value", kind: "message", T: Struct, oneof: "kind" },
    { no: 6, name: "list_value", kind: "message", T: ListValue, oneof: "kind" },
]);
/**
 * `ListValue` is a wrapper around a repeated field of values.
 *
 * The JSON representation for `ListValue` is JSON array.
 *
 * @generated from message google.protobuf.ListValue
 */
class ListValue extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * Repeated field of dynamically typed values.
         *
         * @generated from field: repeated google.protobuf.Value values = 1;
         */
        this.values = [];
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        return this.values.map(v => v.toJson());
    }
    fromJson(json, options) {
        if (!Array.isArray(json)) {
            throw new Error("cannot decode google.protobuf.ListValue from JSON " + proto3_js_1.proto3.json.debug(json));
        }
        for (let e of json) {
            this.values.push(Value.fromJson(e));
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new ListValue().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new ListValue().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new ListValue().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(ListValue, a, b);
    }
}
exports.ListValue = ListValue;
ListValue.runtime = proto3_js_1.proto3;
ListValue.typeName = "google.protobuf.ListValue";
ListValue.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "values", kind: "message", T: Value, repeated: true },
]);


/***/ }),
/* 53 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BytesValue = exports.StringValue = exports.BoolValue = exports.UInt32Value = exports.Int32Value = exports.UInt64Value = exports.Int64Value = exports.FloatValue = exports.DoubleValue = void 0;
const message_js_1 = __webpack_require__(16);
const proto3_js_1 = __webpack_require__(11);
const scalar_js_1 = __webpack_require__(21);
const proto_int64_js_1 = __webpack_require__(19);
/**
 * Wrapper message for `double`.
 *
 * The JSON representation for `DoubleValue` is JSON number.
 *
 * @generated from message google.protobuf.DoubleValue
 */
class DoubleValue extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The double value.
         *
         * @generated from field: double value = 1;
         */
        this.value = 0;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        return proto3_js_1.proto3.json.writeScalar(scalar_js_1.ScalarType.DOUBLE, this.value, true);
    }
    fromJson(json, options) {
        try {
            this.value = proto3_js_1.proto3.json.readScalar(scalar_js_1.ScalarType.DOUBLE, json);
        }
        catch (e) {
            let m = `cannot decode message google.protobuf.DoubleValue from JSON"`;
            if (e instanceof Error && e.message.length > 0) {
                m += `: ${e.message}`;
            }
            throw new Error(m);
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new DoubleValue().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new DoubleValue().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new DoubleValue().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(DoubleValue, a, b);
    }
}
exports.DoubleValue = DoubleValue;
DoubleValue.runtime = proto3_js_1.proto3;
DoubleValue.typeName = "google.protobuf.DoubleValue";
DoubleValue.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "value", kind: "scalar", T: 1 /* ScalarType.DOUBLE */ },
]);
DoubleValue.fieldWrapper = {
    wrapField(value) {
        return new DoubleValue({ value });
    },
    unwrapField(value) {
        return value.value;
    }
};
/**
 * Wrapper message for `float`.
 *
 * The JSON representation for `FloatValue` is JSON number.
 *
 * @generated from message google.protobuf.FloatValue
 */
class FloatValue extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The float value.
         *
         * @generated from field: float value = 1;
         */
        this.value = 0;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        return proto3_js_1.proto3.json.writeScalar(scalar_js_1.ScalarType.FLOAT, this.value, true);
    }
    fromJson(json, options) {
        try {
            this.value = proto3_js_1.proto3.json.readScalar(scalar_js_1.ScalarType.FLOAT, json);
        }
        catch (e) {
            let m = `cannot decode message google.protobuf.FloatValue from JSON"`;
            if (e instanceof Error && e.message.length > 0) {
                m += `: ${e.message}`;
            }
            throw new Error(m);
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new FloatValue().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new FloatValue().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new FloatValue().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(FloatValue, a, b);
    }
}
exports.FloatValue = FloatValue;
FloatValue.runtime = proto3_js_1.proto3;
FloatValue.typeName = "google.protobuf.FloatValue";
FloatValue.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "value", kind: "scalar", T: 2 /* ScalarType.FLOAT */ },
]);
FloatValue.fieldWrapper = {
    wrapField(value) {
        return new FloatValue({ value });
    },
    unwrapField(value) {
        return value.value;
    }
};
/**
 * Wrapper message for `int64`.
 *
 * The JSON representation for `Int64Value` is JSON string.
 *
 * @generated from message google.protobuf.Int64Value
 */
class Int64Value extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The int64 value.
         *
         * @generated from field: int64 value = 1;
         */
        this.value = proto_int64_js_1.protoInt64.zero;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        return proto3_js_1.proto3.json.writeScalar(scalar_js_1.ScalarType.INT64, this.value, true);
    }
    fromJson(json, options) {
        try {
            this.value = proto3_js_1.proto3.json.readScalar(scalar_js_1.ScalarType.INT64, json);
        }
        catch (e) {
            let m = `cannot decode message google.protobuf.Int64Value from JSON"`;
            if (e instanceof Error && e.message.length > 0) {
                m += `: ${e.message}`;
            }
            throw new Error(m);
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new Int64Value().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Int64Value().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Int64Value().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Int64Value, a, b);
    }
}
exports.Int64Value = Int64Value;
Int64Value.runtime = proto3_js_1.proto3;
Int64Value.typeName = "google.protobuf.Int64Value";
Int64Value.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "value", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
]);
Int64Value.fieldWrapper = {
    wrapField(value) {
        return new Int64Value({ value });
    },
    unwrapField(value) {
        return value.value;
    }
};
/**
 * Wrapper message for `uint64`.
 *
 * The JSON representation for `UInt64Value` is JSON string.
 *
 * @generated from message google.protobuf.UInt64Value
 */
class UInt64Value extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The uint64 value.
         *
         * @generated from field: uint64 value = 1;
         */
        this.value = proto_int64_js_1.protoInt64.zero;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        return proto3_js_1.proto3.json.writeScalar(scalar_js_1.ScalarType.UINT64, this.value, true);
    }
    fromJson(json, options) {
        try {
            this.value = proto3_js_1.proto3.json.readScalar(scalar_js_1.ScalarType.UINT64, json);
        }
        catch (e) {
            let m = `cannot decode message google.protobuf.UInt64Value from JSON"`;
            if (e instanceof Error && e.message.length > 0) {
                m += `: ${e.message}`;
            }
            throw new Error(m);
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new UInt64Value().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new UInt64Value().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new UInt64Value().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(UInt64Value, a, b);
    }
}
exports.UInt64Value = UInt64Value;
UInt64Value.runtime = proto3_js_1.proto3;
UInt64Value.typeName = "google.protobuf.UInt64Value";
UInt64Value.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "value", kind: "scalar", T: 4 /* ScalarType.UINT64 */ },
]);
UInt64Value.fieldWrapper = {
    wrapField(value) {
        return new UInt64Value({ value });
    },
    unwrapField(value) {
        return value.value;
    }
};
/**
 * Wrapper message for `int32`.
 *
 * The JSON representation for `Int32Value` is JSON number.
 *
 * @generated from message google.protobuf.Int32Value
 */
class Int32Value extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The int32 value.
         *
         * @generated from field: int32 value = 1;
         */
        this.value = 0;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        return proto3_js_1.proto3.json.writeScalar(scalar_js_1.ScalarType.INT32, this.value, true);
    }
    fromJson(json, options) {
        try {
            this.value = proto3_js_1.proto3.json.readScalar(scalar_js_1.ScalarType.INT32, json);
        }
        catch (e) {
            let m = `cannot decode message google.protobuf.Int32Value from JSON"`;
            if (e instanceof Error && e.message.length > 0) {
                m += `: ${e.message}`;
            }
            throw new Error(m);
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new Int32Value().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Int32Value().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Int32Value().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Int32Value, a, b);
    }
}
exports.Int32Value = Int32Value;
Int32Value.runtime = proto3_js_1.proto3;
Int32Value.typeName = "google.protobuf.Int32Value";
Int32Value.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "value", kind: "scalar", T: 5 /* ScalarType.INT32 */ },
]);
Int32Value.fieldWrapper = {
    wrapField(value) {
        return new Int32Value({ value });
    },
    unwrapField(value) {
        return value.value;
    }
};
/**
 * Wrapper message for `uint32`.
 *
 * The JSON representation for `UInt32Value` is JSON number.
 *
 * @generated from message google.protobuf.UInt32Value
 */
class UInt32Value extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The uint32 value.
         *
         * @generated from field: uint32 value = 1;
         */
        this.value = 0;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        return proto3_js_1.proto3.json.writeScalar(scalar_js_1.ScalarType.UINT32, this.value, true);
    }
    fromJson(json, options) {
        try {
            this.value = proto3_js_1.proto3.json.readScalar(scalar_js_1.ScalarType.UINT32, json);
        }
        catch (e) {
            let m = `cannot decode message google.protobuf.UInt32Value from JSON"`;
            if (e instanceof Error && e.message.length > 0) {
                m += `: ${e.message}`;
            }
            throw new Error(m);
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new UInt32Value().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new UInt32Value().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new UInt32Value().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(UInt32Value, a, b);
    }
}
exports.UInt32Value = UInt32Value;
UInt32Value.runtime = proto3_js_1.proto3;
UInt32Value.typeName = "google.protobuf.UInt32Value";
UInt32Value.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "value", kind: "scalar", T: 13 /* ScalarType.UINT32 */ },
]);
UInt32Value.fieldWrapper = {
    wrapField(value) {
        return new UInt32Value({ value });
    },
    unwrapField(value) {
        return value.value;
    }
};
/**
 * Wrapper message for `bool`.
 *
 * The JSON representation for `BoolValue` is JSON `true` and `false`.
 *
 * @generated from message google.protobuf.BoolValue
 */
class BoolValue extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The bool value.
         *
         * @generated from field: bool value = 1;
         */
        this.value = false;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        return proto3_js_1.proto3.json.writeScalar(scalar_js_1.ScalarType.BOOL, this.value, true);
    }
    fromJson(json, options) {
        try {
            this.value = proto3_js_1.proto3.json.readScalar(scalar_js_1.ScalarType.BOOL, json);
        }
        catch (e) {
            let m = `cannot decode message google.protobuf.BoolValue from JSON"`;
            if (e instanceof Error && e.message.length > 0) {
                m += `: ${e.message}`;
            }
            throw new Error(m);
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new BoolValue().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new BoolValue().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new BoolValue().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(BoolValue, a, b);
    }
}
exports.BoolValue = BoolValue;
BoolValue.runtime = proto3_js_1.proto3;
BoolValue.typeName = "google.protobuf.BoolValue";
BoolValue.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "value", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
]);
BoolValue.fieldWrapper = {
    wrapField(value) {
        return new BoolValue({ value });
    },
    unwrapField(value) {
        return value.value;
    }
};
/**
 * Wrapper message for `string`.
 *
 * The JSON representation for `StringValue` is JSON string.
 *
 * @generated from message google.protobuf.StringValue
 */
class StringValue extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The string value.
         *
         * @generated from field: string value = 1;
         */
        this.value = "";
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        return proto3_js_1.proto3.json.writeScalar(scalar_js_1.ScalarType.STRING, this.value, true);
    }
    fromJson(json, options) {
        try {
            this.value = proto3_js_1.proto3.json.readScalar(scalar_js_1.ScalarType.STRING, json);
        }
        catch (e) {
            let m = `cannot decode message google.protobuf.StringValue from JSON"`;
            if (e instanceof Error && e.message.length > 0) {
                m += `: ${e.message}`;
            }
            throw new Error(m);
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new StringValue().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new StringValue().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new StringValue().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(StringValue, a, b);
    }
}
exports.StringValue = StringValue;
StringValue.runtime = proto3_js_1.proto3;
StringValue.typeName = "google.protobuf.StringValue";
StringValue.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "value", kind: "scalar", T: 9 /* ScalarType.STRING */ },
]);
StringValue.fieldWrapper = {
    wrapField(value) {
        return new StringValue({ value });
    },
    unwrapField(value) {
        return value.value;
    }
};
/**
 * Wrapper message for `bytes`.
 *
 * The JSON representation for `BytesValue` is JSON string.
 *
 * @generated from message google.protobuf.BytesValue
 */
class BytesValue extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The bytes value.
         *
         * @generated from field: bytes value = 1;
         */
        this.value = new Uint8Array(0);
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    toJson(options) {
        return proto3_js_1.proto3.json.writeScalar(scalar_js_1.ScalarType.BYTES, this.value, true);
    }
    fromJson(json, options) {
        try {
            this.value = proto3_js_1.proto3.json.readScalar(scalar_js_1.ScalarType.BYTES, json);
        }
        catch (e) {
            let m = `cannot decode message google.protobuf.BytesValue from JSON"`;
            if (e instanceof Error && e.message.length > 0) {
                m += `: ${e.message}`;
            }
            throw new Error(m);
        }
        return this;
    }
    static fromBinary(bytes, options) {
        return new BytesValue().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new BytesValue().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new BytesValue().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(BytesValue, a, b);
    }
}
exports.BytesValue = BytesValue;
BytesValue.runtime = proto3_js_1.proto3;
BytesValue.typeName = "google.protobuf.BytesValue";
BytesValue.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "value", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
]);
BytesValue.fieldWrapper = {
    wrapField(value) {
        return new BytesValue({ value });
    },
    unwrapField(value) {
        return value.value;
    }
};


/***/ }),
/* 54 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toPlainMessage = void 0;
const is_message_js_1 = __webpack_require__(27);
/**
 * toPlainMessage returns a new object by stripping
 * all methods from a message, leaving only fields and
 * oneof groups. It is recursive, meaning it applies this
 * same logic to all nested message fields as well.
 *
 * If the argument is already a plain message, it is
 * returned as-is.
 */
function toPlainMessage(message) {
    if (!(0, is_message_js_1.isMessage)(message)) {
        return message;
    }
    const type = message.getType();
    const target = {};
    for (const member of type.fields.byMember()) {
        const source = message[member.localName];
        let copy;
        if (member.repeated) {
            copy = source.map((e) => toPlainValue(e));
        }
        else if (member.kind == "map") {
            copy = {};
            for (const [key, v] of Object.entries(source)) {
                copy[key] = toPlainValue(v);
            }
        }
        else if (member.kind == "oneof") {
            const f = member.findField(source.case);
            copy = f
                ? { case: source.case, value: toPlainValue(source.value) }
                : { case: undefined };
        }
        else {
            copy = toPlainValue(source);
        }
        target[member.localName] = copy;
    }
    return target;
}
exports.toPlainMessage = toPlainMessage;
function toPlainValue(value) {
    if (value === undefined) {
        return value;
    }
    if ((0, is_message_js_1.isMessage)(value)) {
        return toPlainMessage(value);
    }
    if (value instanceof Uint8Array) {
        const c = new Uint8Array(value.byteLength);
        c.set(value);
        return c;
    }
    return value;
}


/***/ }),
/* 55 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodeGeneratorResponse_File = exports.CodeGeneratorResponse_Feature = exports.CodeGeneratorResponse = exports.CodeGeneratorRequest = exports.Version = void 0;
const message_js_1 = __webpack_require__(16);
const proto2_js_1 = __webpack_require__(35);
const descriptor_pb_js_1 = __webpack_require__(42);
/**
 * The version number of protocol compiler.
 *
 * @generated from message google.protobuf.compiler.Version
 */
class Version extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new Version().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Version().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Version().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(Version, a, b);
    }
}
exports.Version = Version;
Version.runtime = proto2_js_1.proto2;
Version.typeName = "google.protobuf.compiler.Version";
Version.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "major", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 2, name: "minor", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 3, name: "patch", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 4, name: "suffix", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
]);
/**
 * An encoded CodeGeneratorRequest is written to the plugin's stdin.
 *
 * @generated from message google.protobuf.compiler.CodeGeneratorRequest
 */
class CodeGeneratorRequest extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The .proto files that were explicitly listed on the command-line.  The
         * code generator should generate code only for these files.  Each file's
         * descriptor will be included in proto_file, below.
         *
         * @generated from field: repeated string file_to_generate = 1;
         */
        this.fileToGenerate = [];
        /**
         * FileDescriptorProtos for all files in files_to_generate and everything
         * they import.  The files will appear in topological order, so each file
         * appears before any file that imports it.
         *
         * Note: the files listed in files_to_generate will include runtime-retention
         * options only, but all other files will include source-retention options.
         * The source_file_descriptors field below is available in case you need
         * source-retention options for files_to_generate.
         *
         * protoc guarantees that all proto_files will be written after
         * the fields above, even though this is not technically guaranteed by the
         * protobuf wire format.  This theoretically could allow a plugin to stream
         * in the FileDescriptorProtos and handle them one by one rather than read
         * the entire set into memory at once.  However, as of this writing, this
         * is not similarly optimized on protoc's end -- it will store all fields in
         * memory at once before sending them to the plugin.
         *
         * Type names of fields and extensions in the FileDescriptorProto are always
         * fully qualified.
         *
         * @generated from field: repeated google.protobuf.FileDescriptorProto proto_file = 15;
         */
        this.protoFile = [];
        /**
         * File descriptors with all options, including source-retention options.
         * These descriptors are only provided for the files listed in
         * files_to_generate.
         *
         * @generated from field: repeated google.protobuf.FileDescriptorProto source_file_descriptors = 17;
         */
        this.sourceFileDescriptors = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new CodeGeneratorRequest().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new CodeGeneratorRequest().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new CodeGeneratorRequest().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(CodeGeneratorRequest, a, b);
    }
}
exports.CodeGeneratorRequest = CodeGeneratorRequest;
CodeGeneratorRequest.runtime = proto2_js_1.proto2;
CodeGeneratorRequest.typeName = "google.protobuf.compiler.CodeGeneratorRequest";
CodeGeneratorRequest.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "file_to_generate", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
    { no: 2, name: "parameter", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 15, name: "proto_file", kind: "message", T: descriptor_pb_js_1.FileDescriptorProto, repeated: true },
    { no: 17, name: "source_file_descriptors", kind: "message", T: descriptor_pb_js_1.FileDescriptorProto, repeated: true },
    { no: 3, name: "compiler_version", kind: "message", T: Version, opt: true },
]);
/**
 * The plugin writes an encoded CodeGeneratorResponse to stdout.
 *
 * @generated from message google.protobuf.compiler.CodeGeneratorResponse
 */
class CodeGeneratorResponse extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * @generated from field: repeated google.protobuf.compiler.CodeGeneratorResponse.File file = 15;
         */
        this.file = [];
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new CodeGeneratorResponse().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new CodeGeneratorResponse().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new CodeGeneratorResponse().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(CodeGeneratorResponse, a, b);
    }
}
exports.CodeGeneratorResponse = CodeGeneratorResponse;
CodeGeneratorResponse.runtime = proto2_js_1.proto2;
CodeGeneratorResponse.typeName = "google.protobuf.compiler.CodeGeneratorResponse";
CodeGeneratorResponse.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "error", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 2, name: "supported_features", kind: "scalar", T: 4 /* ScalarType.UINT64 */, opt: true },
    { no: 3, name: "minimum_edition", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 4, name: "maximum_edition", kind: "scalar", T: 5 /* ScalarType.INT32 */, opt: true },
    { no: 15, name: "file", kind: "message", T: CodeGeneratorResponse_File, repeated: true },
]);
/**
 * Sync with code_generator.h.
 *
 * @generated from enum google.protobuf.compiler.CodeGeneratorResponse.Feature
 */
var CodeGeneratorResponse_Feature;
(function (CodeGeneratorResponse_Feature) {
    /**
     * @generated from enum value: FEATURE_NONE = 0;
     */
    CodeGeneratorResponse_Feature[CodeGeneratorResponse_Feature["NONE"] = 0] = "NONE";
    /**
     * @generated from enum value: FEATURE_PROTO3_OPTIONAL = 1;
     */
    CodeGeneratorResponse_Feature[CodeGeneratorResponse_Feature["PROTO3_OPTIONAL"] = 1] = "PROTO3_OPTIONAL";
    /**
     * @generated from enum value: FEATURE_SUPPORTS_EDITIONS = 2;
     */
    CodeGeneratorResponse_Feature[CodeGeneratorResponse_Feature["SUPPORTS_EDITIONS"] = 2] = "SUPPORTS_EDITIONS";
})(CodeGeneratorResponse_Feature || (exports.CodeGeneratorResponse_Feature = CodeGeneratorResponse_Feature = {}));
// Retrieve enum metadata with: proto2.getEnumType(CodeGeneratorResponse_Feature)
proto2_js_1.proto2.util.setEnumType(CodeGeneratorResponse_Feature, "google.protobuf.compiler.CodeGeneratorResponse.Feature", [
    { no: 0, name: "FEATURE_NONE" },
    { no: 1, name: "FEATURE_PROTO3_OPTIONAL" },
    { no: 2, name: "FEATURE_SUPPORTS_EDITIONS" },
]);
/**
 * Represents a single generated file.
 *
 * @generated from message google.protobuf.compiler.CodeGeneratorResponse.File
 */
class CodeGeneratorResponse_File extends message_js_1.Message {
    constructor(data) {
        super();
        proto2_js_1.proto2.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new CodeGeneratorResponse_File().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new CodeGeneratorResponse_File().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new CodeGeneratorResponse_File().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto2_js_1.proto2.util.equals(CodeGeneratorResponse_File, a, b);
    }
}
exports.CodeGeneratorResponse_File = CodeGeneratorResponse_File;
CodeGeneratorResponse_File.runtime = proto2_js_1.proto2;
CodeGeneratorResponse_File.typeName = "google.protobuf.compiler.CodeGeneratorResponse.File";
CodeGeneratorResponse_File.fields = proto2_js_1.proto2.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 2, name: "insertion_point", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 15, name: "content", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 16, name: "generated_code_info", kind: "message", T: descriptor_pb_js_1.GeneratedCodeInfo, opt: true },
]);


/***/ }),
/* 56 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Mixin = exports.Method = exports.Api = void 0;
const message_js_1 = __webpack_require__(16);
const type_pb_js_1 = __webpack_require__(57);
const source_context_pb_js_1 = __webpack_require__(58);
const proto3_js_1 = __webpack_require__(11);
/**
 * Api is a light-weight descriptor for an API Interface.
 *
 * Interfaces are also described as "protocol buffer services" in some contexts,
 * such as by the "service" keyword in a .proto file, but they are different
 * from API Services, which represent a concrete implementation of an interface
 * as opposed to simply a description of methods and bindings. They are also
 * sometimes simply referred to as "APIs" in other contexts, such as the name of
 * this message itself. See https://cloud.google.com/apis/design/glossary for
 * detailed terminology.
 *
 * @generated from message google.protobuf.Api
 */
class Api extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The fully qualified name of this interface, including package name
         * followed by the interface's simple name.
         *
         * @generated from field: string name = 1;
         */
        this.name = "";
        /**
         * The methods of this interface, in unspecified order.
         *
         * @generated from field: repeated google.protobuf.Method methods = 2;
         */
        this.methods = [];
        /**
         * Any metadata attached to the interface.
         *
         * @generated from field: repeated google.protobuf.Option options = 3;
         */
        this.options = [];
        /**
         * A version string for this interface. If specified, must have the form
         * `major-version.minor-version`, as in `1.10`. If the minor version is
         * omitted, it defaults to zero. If the entire version field is empty, the
         * major version is derived from the package name, as outlined below. If the
         * field is not empty, the version in the package name will be verified to be
         * consistent with what is provided here.
         *
         * The versioning schema uses [semantic
         * versioning](http://semver.org) where the major version number
         * indicates a breaking change and the minor version an additive,
         * non-breaking change. Both version numbers are signals to users
         * what to expect from different versions, and should be carefully
         * chosen based on the product plan.
         *
         * The major version is also reflected in the package name of the
         * interface, which must end in `v<major-version>`, as in
         * `google.feature.v1`. For major versions 0 and 1, the suffix can
         * be omitted. Zero major versions must only be used for
         * experimental, non-GA interfaces.
         *
         *
         * @generated from field: string version = 4;
         */
        this.version = "";
        /**
         * Included interfaces. See [Mixin][].
         *
         * @generated from field: repeated google.protobuf.Mixin mixins = 6;
         */
        this.mixins = [];
        /**
         * The source syntax of the service.
         *
         * @generated from field: google.protobuf.Syntax syntax = 7;
         */
        this.syntax = type_pb_js_1.Syntax.PROTO2;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new Api().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Api().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Api().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Api, a, b);
    }
}
exports.Api = Api;
Api.runtime = proto3_js_1.proto3;
Api.typeName = "google.protobuf.Api";
Api.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "methods", kind: "message", T: Method, repeated: true },
    { no: 3, name: "options", kind: "message", T: type_pb_js_1.Option, repeated: true },
    { no: 4, name: "version", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "source_context", kind: "message", T: source_context_pb_js_1.SourceContext },
    { no: 6, name: "mixins", kind: "message", T: Mixin, repeated: true },
    { no: 7, name: "syntax", kind: "enum", T: proto3_js_1.proto3.getEnumType(type_pb_js_1.Syntax) },
]);
/**
 * Method represents a method of an API interface.
 *
 * @generated from message google.protobuf.Method
 */
class Method extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The simple name of this method.
         *
         * @generated from field: string name = 1;
         */
        this.name = "";
        /**
         * A URL of the input message type.
         *
         * @generated from field: string request_type_url = 2;
         */
        this.requestTypeUrl = "";
        /**
         * If true, the request is streamed.
         *
         * @generated from field: bool request_streaming = 3;
         */
        this.requestStreaming = false;
        /**
         * The URL of the output message type.
         *
         * @generated from field: string response_type_url = 4;
         */
        this.responseTypeUrl = "";
        /**
         * If true, the response is streamed.
         *
         * @generated from field: bool response_streaming = 5;
         */
        this.responseStreaming = false;
        /**
         * Any metadata attached to the method.
         *
         * @generated from field: repeated google.protobuf.Option options = 6;
         */
        this.options = [];
        /**
         * The source syntax of this method.
         *
         * @generated from field: google.protobuf.Syntax syntax = 7;
         */
        this.syntax = type_pb_js_1.Syntax.PROTO2;
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new Method().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Method().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Method().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Method, a, b);
    }
}
exports.Method = Method;
Method.runtime = proto3_js_1.proto3;
Method.typeName = "google.protobuf.Method";
Method.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "request_type_url", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "request_streaming", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
    { no: 4, name: "response_type_url", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "response_streaming", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
    { no: 6, name: "options", kind: "message", T: type_pb_js_1.Option, repeated: true },
    { no: 7, name: "syntax", kind: "enum", T: proto3_js_1.proto3.getEnumType(type_pb_js_1.Syntax) },
]);
/**
 * Declares an API Interface to be included in this interface. The including
 * interface must redeclare all the methods from the included interface, but
 * documentation and options are inherited as follows:
 *
 * - If after comment and whitespace stripping, the documentation
 *   string of the redeclared method is empty, it will be inherited
 *   from the original method.
 *
 * - Each annotation belonging to the service config (http,
 *   visibility) which is not set in the redeclared method will be
 *   inherited.
 *
 * - If an http annotation is inherited, the path pattern will be
 *   modified as follows. Any version prefix will be replaced by the
 *   version of the including interface plus the [root][] path if
 *   specified.
 *
 * Example of a simple mixin:
 *
 *     package google.acl.v1;
 *     service AccessControl {
 *       // Get the underlying ACL object.
 *       rpc GetAcl(GetAclRequest) returns (Acl) {
 *         option (google.api.http).get = "/v1/{resource=**}:getAcl";
 *       }
 *     }
 *
 *     package google.storage.v2;
 *     service Storage {
 *       rpc GetAcl(GetAclRequest) returns (Acl);
 *
 *       // Get a data record.
 *       rpc GetData(GetDataRequest) returns (Data) {
 *         option (google.api.http).get = "/v2/{resource=**}";
 *       }
 *     }
 *
 * Example of a mixin configuration:
 *
 *     apis:
 *     - name: google.storage.v2.Storage
 *       mixins:
 *       - name: google.acl.v1.AccessControl
 *
 * The mixin construct implies that all methods in `AccessControl` are
 * also declared with same name and request/response types in
 * `Storage`. A documentation generator or annotation processor will
 * see the effective `Storage.GetAcl` method after inherting
 * documentation and annotations as follows:
 *
 *     service Storage {
 *       // Get the underlying ACL object.
 *       rpc GetAcl(GetAclRequest) returns (Acl) {
 *         option (google.api.http).get = "/v2/{resource=**}:getAcl";
 *       }
 *       ...
 *     }
 *
 * Note how the version in the path pattern changed from `v1` to `v2`.
 *
 * If the `root` field in the mixin is specified, it should be a
 * relative path under which inherited HTTP paths are placed. Example:
 *
 *     apis:
 *     - name: google.storage.v2.Storage
 *       mixins:
 *       - name: google.acl.v1.AccessControl
 *         root: acls
 *
 * This implies the following inherited HTTP annotation:
 *
 *     service Storage {
 *       // Get the underlying ACL object.
 *       rpc GetAcl(GetAclRequest) returns (Acl) {
 *         option (google.api.http).get = "/v2/acls/{resource=**}:getAcl";
 *       }
 *       ...
 *     }
 *
 * @generated from message google.protobuf.Mixin
 */
class Mixin extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The fully qualified name of the interface which is included.
         *
         * @generated from field: string name = 1;
         */
        this.name = "";
        /**
         * If non-empty specifies a path under which inherited HTTP paths
         * are rooted.
         *
         * @generated from field: string root = 2;
         */
        this.root = "";
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new Mixin().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Mixin().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Mixin().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Mixin, a, b);
    }
}
exports.Mixin = Mixin;
Mixin.runtime = proto3_js_1.proto3;
Mixin.typeName = "google.protobuf.Mixin";
Mixin.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "root", kind: "scalar", T: 9 /* ScalarType.STRING */ },
]);


/***/ }),
/* 57 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Option = exports.EnumValue = exports.Enum = exports.Field_Cardinality = exports.Field_Kind = exports.Field = exports.Type = exports.Syntax = void 0;
// @generated by protoc-gen-es v1.10.1 with parameter "bootstrap_wkt=true,ts_nocheck=false,target=ts"
// @generated from file google/protobuf/type.proto (package google.protobuf, syntax proto3)
/* eslint-disable */
const proto3_js_1 = __webpack_require__(11);
const message_js_1 = __webpack_require__(16);
const source_context_pb_js_1 = __webpack_require__(58);
const any_pb_js_1 = __webpack_require__(49);
/**
 * The syntax in which a protocol buffer element is defined.
 *
 * @generated from enum google.protobuf.Syntax
 */
var Syntax;
(function (Syntax) {
    /**
     * Syntax `proto2`.
     *
     * @generated from enum value: SYNTAX_PROTO2 = 0;
     */
    Syntax[Syntax["PROTO2"] = 0] = "PROTO2";
    /**
     * Syntax `proto3`.
     *
     * @generated from enum value: SYNTAX_PROTO3 = 1;
     */
    Syntax[Syntax["PROTO3"] = 1] = "PROTO3";
    /**
     * Syntax `editions`.
     *
     * @generated from enum value: SYNTAX_EDITIONS = 2;
     */
    Syntax[Syntax["EDITIONS"] = 2] = "EDITIONS";
})(Syntax || (exports.Syntax = Syntax = {}));
// Retrieve enum metadata with: proto3.getEnumType(Syntax)
proto3_js_1.proto3.util.setEnumType(Syntax, "google.protobuf.Syntax", [
    { no: 0, name: "SYNTAX_PROTO2" },
    { no: 1, name: "SYNTAX_PROTO3" },
    { no: 2, name: "SYNTAX_EDITIONS" },
]);
/**
 * A protocol buffer message type.
 *
 * @generated from message google.protobuf.Type
 */
class Type extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The fully qualified message name.
         *
         * @generated from field: string name = 1;
         */
        this.name = "";
        /**
         * The list of fields.
         *
         * @generated from field: repeated google.protobuf.Field fields = 2;
         */
        this.fields = [];
        /**
         * The list of types appearing in `oneof` definitions in this type.
         *
         * @generated from field: repeated string oneofs = 3;
         */
        this.oneofs = [];
        /**
         * The protocol buffer options.
         *
         * @generated from field: repeated google.protobuf.Option options = 4;
         */
        this.options = [];
        /**
         * The source syntax.
         *
         * @generated from field: google.protobuf.Syntax syntax = 6;
         */
        this.syntax = Syntax.PROTO2;
        /**
         * The source edition string, only valid when syntax is SYNTAX_EDITIONS.
         *
         * @generated from field: string edition = 7;
         */
        this.edition = "";
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new Type().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Type().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Type().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Type, a, b);
    }
}
exports.Type = Type;
Type.runtime = proto3_js_1.proto3;
Type.typeName = "google.protobuf.Type";
Type.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "fields", kind: "message", T: Field, repeated: true },
    { no: 3, name: "oneofs", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
    { no: 4, name: "options", kind: "message", T: Option, repeated: true },
    { no: 5, name: "source_context", kind: "message", T: source_context_pb_js_1.SourceContext },
    { no: 6, name: "syntax", kind: "enum", T: proto3_js_1.proto3.getEnumType(Syntax) },
    { no: 7, name: "edition", kind: "scalar", T: 9 /* ScalarType.STRING */ },
]);
/**
 * A single field of a message type.
 *
 * @generated from message google.protobuf.Field
 */
class Field extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The field type.
         *
         * @generated from field: google.protobuf.Field.Kind kind = 1;
         */
        this.kind = Field_Kind.TYPE_UNKNOWN;
        /**
         * The field cardinality.
         *
         * @generated from field: google.protobuf.Field.Cardinality cardinality = 2;
         */
        this.cardinality = Field_Cardinality.UNKNOWN;
        /**
         * The field number.
         *
         * @generated from field: int32 number = 3;
         */
        this.number = 0;
        /**
         * The field name.
         *
         * @generated from field: string name = 4;
         */
        this.name = "";
        /**
         * The field type URL, without the scheme, for message or enumeration
         * types. Example: `"type.googleapis.com/google.protobuf.Timestamp"`.
         *
         * @generated from field: string type_url = 6;
         */
        this.typeUrl = "";
        /**
         * The index of the field type in `Type.oneofs`, for message or enumeration
         * types. The first type has index 1; zero means the type is not in the list.
         *
         * @generated from field: int32 oneof_index = 7;
         */
        this.oneofIndex = 0;
        /**
         * Whether to use alternative packed wire representation.
         *
         * @generated from field: bool packed = 8;
         */
        this.packed = false;
        /**
         * The protocol buffer options.
         *
         * @generated from field: repeated google.protobuf.Option options = 9;
         */
        this.options = [];
        /**
         * The field JSON name.
         *
         * @generated from field: string json_name = 10;
         */
        this.jsonName = "";
        /**
         * The string value of the default value of this field. Proto2 syntax only.
         *
         * @generated from field: string default_value = 11;
         */
        this.defaultValue = "";
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new Field().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Field().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Field().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Field, a, b);
    }
}
exports.Field = Field;
Field.runtime = proto3_js_1.proto3;
Field.typeName = "google.protobuf.Field";
Field.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "kind", kind: "enum", T: proto3_js_1.proto3.getEnumType(Field_Kind) },
    { no: 2, name: "cardinality", kind: "enum", T: proto3_js_1.proto3.getEnumType(Field_Cardinality) },
    { no: 3, name: "number", kind: "scalar", T: 5 /* ScalarType.INT32 */ },
    { no: 4, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 6, name: "type_url", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 7, name: "oneof_index", kind: "scalar", T: 5 /* ScalarType.INT32 */ },
    { no: 8, name: "packed", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
    { no: 9, name: "options", kind: "message", T: Option, repeated: true },
    { no: 10, name: "json_name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 11, name: "default_value", kind: "scalar", T: 9 /* ScalarType.STRING */ },
]);
/**
 * Basic field types.
 *
 * @generated from enum google.protobuf.Field.Kind
 */
var Field_Kind;
(function (Field_Kind) {
    /**
     * Field type unknown.
     *
     * @generated from enum value: TYPE_UNKNOWN = 0;
     */
    Field_Kind[Field_Kind["TYPE_UNKNOWN"] = 0] = "TYPE_UNKNOWN";
    /**
     * Field type double.
     *
     * @generated from enum value: TYPE_DOUBLE = 1;
     */
    Field_Kind[Field_Kind["TYPE_DOUBLE"] = 1] = "TYPE_DOUBLE";
    /**
     * Field type float.
     *
     * @generated from enum value: TYPE_FLOAT = 2;
     */
    Field_Kind[Field_Kind["TYPE_FLOAT"] = 2] = "TYPE_FLOAT";
    /**
     * Field type int64.
     *
     * @generated from enum value: TYPE_INT64 = 3;
     */
    Field_Kind[Field_Kind["TYPE_INT64"] = 3] = "TYPE_INT64";
    /**
     * Field type uint64.
     *
     * @generated from enum value: TYPE_UINT64 = 4;
     */
    Field_Kind[Field_Kind["TYPE_UINT64"] = 4] = "TYPE_UINT64";
    /**
     * Field type int32.
     *
     * @generated from enum value: TYPE_INT32 = 5;
     */
    Field_Kind[Field_Kind["TYPE_INT32"] = 5] = "TYPE_INT32";
    /**
     * Field type fixed64.
     *
     * @generated from enum value: TYPE_FIXED64 = 6;
     */
    Field_Kind[Field_Kind["TYPE_FIXED64"] = 6] = "TYPE_FIXED64";
    /**
     * Field type fixed32.
     *
     * @generated from enum value: TYPE_FIXED32 = 7;
     */
    Field_Kind[Field_Kind["TYPE_FIXED32"] = 7] = "TYPE_FIXED32";
    /**
     * Field type bool.
     *
     * @generated from enum value: TYPE_BOOL = 8;
     */
    Field_Kind[Field_Kind["TYPE_BOOL"] = 8] = "TYPE_BOOL";
    /**
     * Field type string.
     *
     * @generated from enum value: TYPE_STRING = 9;
     */
    Field_Kind[Field_Kind["TYPE_STRING"] = 9] = "TYPE_STRING";
    /**
     * Field type group. Proto2 syntax only, and deprecated.
     *
     * @generated from enum value: TYPE_GROUP = 10;
     */
    Field_Kind[Field_Kind["TYPE_GROUP"] = 10] = "TYPE_GROUP";
    /**
     * Field type message.
     *
     * @generated from enum value: TYPE_MESSAGE = 11;
     */
    Field_Kind[Field_Kind["TYPE_MESSAGE"] = 11] = "TYPE_MESSAGE";
    /**
     * Field type bytes.
     *
     * @generated from enum value: TYPE_BYTES = 12;
     */
    Field_Kind[Field_Kind["TYPE_BYTES"] = 12] = "TYPE_BYTES";
    /**
     * Field type uint32.
     *
     * @generated from enum value: TYPE_UINT32 = 13;
     */
    Field_Kind[Field_Kind["TYPE_UINT32"] = 13] = "TYPE_UINT32";
    /**
     * Field type enum.
     *
     * @generated from enum value: TYPE_ENUM = 14;
     */
    Field_Kind[Field_Kind["TYPE_ENUM"] = 14] = "TYPE_ENUM";
    /**
     * Field type sfixed32.
     *
     * @generated from enum value: TYPE_SFIXED32 = 15;
     */
    Field_Kind[Field_Kind["TYPE_SFIXED32"] = 15] = "TYPE_SFIXED32";
    /**
     * Field type sfixed64.
     *
     * @generated from enum value: TYPE_SFIXED64 = 16;
     */
    Field_Kind[Field_Kind["TYPE_SFIXED64"] = 16] = "TYPE_SFIXED64";
    /**
     * Field type sint32.
     *
     * @generated from enum value: TYPE_SINT32 = 17;
     */
    Field_Kind[Field_Kind["TYPE_SINT32"] = 17] = "TYPE_SINT32";
    /**
     * Field type sint64.
     *
     * @generated from enum value: TYPE_SINT64 = 18;
     */
    Field_Kind[Field_Kind["TYPE_SINT64"] = 18] = "TYPE_SINT64";
})(Field_Kind || (exports.Field_Kind = Field_Kind = {}));
// Retrieve enum metadata with: proto3.getEnumType(Field_Kind)
proto3_js_1.proto3.util.setEnumType(Field_Kind, "google.protobuf.Field.Kind", [
    { no: 0, name: "TYPE_UNKNOWN" },
    { no: 1, name: "TYPE_DOUBLE" },
    { no: 2, name: "TYPE_FLOAT" },
    { no: 3, name: "TYPE_INT64" },
    { no: 4, name: "TYPE_UINT64" },
    { no: 5, name: "TYPE_INT32" },
    { no: 6, name: "TYPE_FIXED64" },
    { no: 7, name: "TYPE_FIXED32" },
    { no: 8, name: "TYPE_BOOL" },
    { no: 9, name: "TYPE_STRING" },
    { no: 10, name: "TYPE_GROUP" },
    { no: 11, name: "TYPE_MESSAGE" },
    { no: 12, name: "TYPE_BYTES" },
    { no: 13, name: "TYPE_UINT32" },
    { no: 14, name: "TYPE_ENUM" },
    { no: 15, name: "TYPE_SFIXED32" },
    { no: 16, name: "TYPE_SFIXED64" },
    { no: 17, name: "TYPE_SINT32" },
    { no: 18, name: "TYPE_SINT64" },
]);
/**
 * Whether a field is optional, required, or repeated.
 *
 * @generated from enum google.protobuf.Field.Cardinality
 */
var Field_Cardinality;
(function (Field_Cardinality) {
    /**
     * For fields with unknown cardinality.
     *
     * @generated from enum value: CARDINALITY_UNKNOWN = 0;
     */
    Field_Cardinality[Field_Cardinality["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * For optional fields.
     *
     * @generated from enum value: CARDINALITY_OPTIONAL = 1;
     */
    Field_Cardinality[Field_Cardinality["OPTIONAL"] = 1] = "OPTIONAL";
    /**
     * For required fields. Proto2 syntax only.
     *
     * @generated from enum value: CARDINALITY_REQUIRED = 2;
     */
    Field_Cardinality[Field_Cardinality["REQUIRED"] = 2] = "REQUIRED";
    /**
     * For repeated fields.
     *
     * @generated from enum value: CARDINALITY_REPEATED = 3;
     */
    Field_Cardinality[Field_Cardinality["REPEATED"] = 3] = "REPEATED";
})(Field_Cardinality || (exports.Field_Cardinality = Field_Cardinality = {}));
// Retrieve enum metadata with: proto3.getEnumType(Field_Cardinality)
proto3_js_1.proto3.util.setEnumType(Field_Cardinality, "google.protobuf.Field.Cardinality", [
    { no: 0, name: "CARDINALITY_UNKNOWN" },
    { no: 1, name: "CARDINALITY_OPTIONAL" },
    { no: 2, name: "CARDINALITY_REQUIRED" },
    { no: 3, name: "CARDINALITY_REPEATED" },
]);
/**
 * Enum type definition.
 *
 * @generated from message google.protobuf.Enum
 */
class Enum extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * Enum type name.
         *
         * @generated from field: string name = 1;
         */
        this.name = "";
        /**
         * Enum value definitions.
         *
         * @generated from field: repeated google.protobuf.EnumValue enumvalue = 2;
         */
        this.enumvalue = [];
        /**
         * Protocol buffer options.
         *
         * @generated from field: repeated google.protobuf.Option options = 3;
         */
        this.options = [];
        /**
         * The source syntax.
         *
         * @generated from field: google.protobuf.Syntax syntax = 5;
         */
        this.syntax = Syntax.PROTO2;
        /**
         * The source edition string, only valid when syntax is SYNTAX_EDITIONS.
         *
         * @generated from field: string edition = 6;
         */
        this.edition = "";
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new Enum().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Enum().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Enum().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Enum, a, b);
    }
}
exports.Enum = Enum;
Enum.runtime = proto3_js_1.proto3;
Enum.typeName = "google.protobuf.Enum";
Enum.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "enumvalue", kind: "message", T: EnumValue, repeated: true },
    { no: 3, name: "options", kind: "message", T: Option, repeated: true },
    { no: 4, name: "source_context", kind: "message", T: source_context_pb_js_1.SourceContext },
    { no: 5, name: "syntax", kind: "enum", T: proto3_js_1.proto3.getEnumType(Syntax) },
    { no: 6, name: "edition", kind: "scalar", T: 9 /* ScalarType.STRING */ },
]);
/**
 * Enum value definition.
 *
 * @generated from message google.protobuf.EnumValue
 */
class EnumValue extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * Enum value name.
         *
         * @generated from field: string name = 1;
         */
        this.name = "";
        /**
         * Enum value number.
         *
         * @generated from field: int32 number = 2;
         */
        this.number = 0;
        /**
         * Protocol buffer options.
         *
         * @generated from field: repeated google.protobuf.Option options = 3;
         */
        this.options = [];
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new EnumValue().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new EnumValue().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new EnumValue().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(EnumValue, a, b);
    }
}
exports.EnumValue = EnumValue;
EnumValue.runtime = proto3_js_1.proto3;
EnumValue.typeName = "google.protobuf.EnumValue";
EnumValue.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "number", kind: "scalar", T: 5 /* ScalarType.INT32 */ },
    { no: 3, name: "options", kind: "message", T: Option, repeated: true },
]);
/**
 * A protocol buffer option, which can be attached to a message, field,
 * enumeration, etc.
 *
 * @generated from message google.protobuf.Option
 */
class Option extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The option's name. For protobuf built-in options (options defined in
         * descriptor.proto), this is the short name. For example, `"map_entry"`.
         * For custom options, it should be the fully-qualified name. For example,
         * `"google.api.http"`.
         *
         * @generated from field: string name = 1;
         */
        this.name = "";
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new Option().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Option().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Option().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(Option, a, b);
    }
}
exports.Option = Option;
Option.runtime = proto3_js_1.proto3;
Option.typeName = "google.protobuf.Option";
Option.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "value", kind: "message", T: any_pb_js_1.Any },
]);


/***/ }),
/* 58 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SourceContext = void 0;
const message_js_1 = __webpack_require__(16);
const proto3_js_1 = __webpack_require__(11);
/**
 * `SourceContext` represents information about the source of a
 * protobuf element, like the file in which it is defined.
 *
 * @generated from message google.protobuf.SourceContext
 */
class SourceContext extends message_js_1.Message {
    constructor(data) {
        super();
        /**
         * The path-qualified name of the .proto file that contained the associated
         * protobuf element.  For example: `"google/protobuf/source_context.proto"`.
         *
         * @generated from field: string file_name = 1;
         */
        this.fileName = "";
        proto3_js_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new SourceContext().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new SourceContext().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new SourceContext().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return proto3_js_1.proto3.util.equals(SourceContext, a, b);
    }
}
exports.SourceContext = SourceContext;
SourceContext.runtime = proto3_js_1.proto3;
SourceContext.typeName = "google.protobuf.SourceContext";
SourceContext.fields = proto3_js_1.proto3.util.newFieldList(() => [
    { no: 1, name: "file_name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
]);


/***/ }),
/* 59 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createCallbackClient = createCallbackClient;
const protobuf_1 = __webpack_require__(10);
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
const any_client_js_1 = __webpack_require__(60);
const async_iterable_js_1 = __webpack_require__(61);
/**
 * Create a CallbackClient for the given service, invoking RPCs through the
 * given transport.
 */
function createCallbackClient(service, transport) {
    return (0, any_client_js_1.makeAnyClient)(service, (method) => {
        switch (method.kind) {
            case protobuf_1.MethodKind.Unary:
                return createUnaryFn(transport, service, method);
            case protobuf_1.MethodKind.ServerStreaming:
                return createServerStreamingFn(transport, service, method);
            default:
                return null;
        }
    });
}
function createUnaryFn(transport, service, method) {
    return function (requestMessage, callback, options) {
        const abort = new AbortController();
        options = wrapSignal(abort, options);
        transport
            .unary(service, method, abort.signal, options.timeoutMs, options.headers, requestMessage, options.contextValues)
            .then((response) => {
            var _a, _b;
            (_a = options.onHeader) === null || _a === void 0 ? void 0 : _a.call(options, response.header);
            (_b = options.onTrailer) === null || _b === void 0 ? void 0 : _b.call(options, response.trailer);
            callback(undefined, response.message);
        }, (reason) => {
            const err = connect_error_js_1.ConnectError.from(reason, code_js_1.Code.Internal);
            if (err.code === code_js_1.Code.Canceled && abort.signal.aborted) {
                // As documented, discard Canceled errors if canceled by the user.
                return;
            }
            callback(err, new method.O());
        });
        return () => abort.abort();
    };
}
function createServerStreamingFn(transport, service, method) {
    return function (input, onResponse, onClose, options) {
        const abort = new AbortController();
        async function run() {
            var _a, e_1, _b, _c;
            var _d, _e;
            options = wrapSignal(abort, options);
            const response = await transport.stream(service, method, options.signal, options.timeoutMs, options.headers, (0, async_iterable_js_1.createAsyncIterable)([input]), options.contextValues);
            (_d = options.onHeader) === null || _d === void 0 ? void 0 : _d.call(options, response.header);
            try {
                for (var _f = true, _g = __asyncValues(response.message), _h; _h = await _g.next(), _a = _h.done, !_a; _f = true) {
                    _c = _h.value;
                    _f = false;
                    const message = _c;
                    onResponse(message);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_f && !_a && (_b = _g.return)) await _b.call(_g);
                }
                finally { if (e_1) throw e_1.error; }
            }
            (_e = options.onTrailer) === null || _e === void 0 ? void 0 : _e.call(options, response.trailer);
            onClose(undefined);
        }
        run().catch((reason) => {
            const err = connect_error_js_1.ConnectError.from(reason, code_js_1.Code.Internal);
            if (err.code === code_js_1.Code.Canceled && abort.signal.aborted) {
                // As documented, discard Canceled errors if canceled by the user,
                // but do invoke the close-callback.
                onClose(undefined);
            }
            else {
                onClose(err);
            }
        });
        return () => abort.abort();
    };
}
function wrapSignal(abort, options) {
    if (options === null || options === void 0 ? void 0 : options.signal) {
        options.signal.addEventListener("abort", () => abort.abort());
        if (options.signal.aborted) {
            abort.abort();
        }
    }
    return Object.assign(Object.assign({}, options), { signal: abort.signal });
}


/***/ }),
/* 60 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.makeAnyClient = makeAnyClient;
/**
 * Create any client for the given service.
 *
 * The given createMethod function is called for each method definition
 * of the service. The function it returns is added to the client object
 * as a method.
 */
function makeAnyClient(service, createMethod) {
    const client = {};
    for (const [localName, methodInfo] of Object.entries(service.methods)) {
        const method = createMethod(Object.assign(Object.assign({}, methodInfo), { localName,
            service }));
        if (method != null) {
            client[localName] = method;
        }
    }
    return client;
}


/***/ }),
/* 61 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pipeTo = pipeTo;
exports.sinkAll = sinkAll;
exports.sinkAllBytes = sinkAllBytes;
exports.pipe = pipe;
exports.transformCatch = transformCatch;
exports.transformCatchFinally = transformCatchFinally;
exports.transformAppend = transformAppend;
exports.transformPrepend = transformPrepend;
exports.transformReadAllBytes = transformReadAllBytes;
exports.transformSerializeEnvelope = transformSerializeEnvelope;
exports.transformParseEnvelope = transformParseEnvelope;
exports.transformCompressEnvelope = transformCompressEnvelope;
exports.transformDecompressEnvelope = transformDecompressEnvelope;
exports.transformJoinEnvelopes = transformJoinEnvelopes;
exports.transformSplitEnvelope = transformSplitEnvelope;
exports.readAllBytes = readAllBytes;
exports.untilFirst = untilFirst;
exports.makeIterableAbortable = makeIterableAbortable;
exports.createWritableIterable = createWritableIterable;
exports.createAsyncIterable = createAsyncIterable;
const code_js_1 = __webpack_require__(7);
const connect_error_js_1 = __webpack_require__(6);
const envelope_js_1 = __webpack_require__(62);
const limit_io_js_1 = __webpack_require__(64);
function pipeTo(source, ...rest) {
    const [transforms, sink, opt] = pickTransformsAndSink(rest);
    let iterable = source;
    let abortable;
    if ((opt === null || opt === void 0 ? void 0 : opt.propagateDownStreamError) === true) {
        iterable = abortable = makeIterableAbortable(iterable);
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    iterable = pipe(iterable, ...transforms, { propagateDownStreamError: false });
    return sink(iterable).catch((reason) => {
        if (abortable) {
            return abortable.abort(reason).then(() => Promise.reject(reason));
        }
        return Promise.reject(reason);
    });
}
// pick transforms, the sink, and options from the pipeTo() rest parameter
function pickTransformsAndSink(rest) {
    let opt;
    if (typeof rest[rest.length - 1] != "function") {
        opt = rest.pop();
    }
    const sink = rest.pop();
    return [rest, sink, opt];
}
/**
 * Creates an AsyncIterableSink that concatenates all elements from the input.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function sinkAll() {
    return async function (iterable) {
        var _a, e_1, _b, _c;
        const all = [];
        try {
            for (var _d = true, iterable_1 = __asyncValues(iterable), iterable_1_1; iterable_1_1 = await iterable_1.next(), _a = iterable_1_1.done, !_a; _d = true) {
                _c = iterable_1_1.value;
                _d = false;
                const chunk = _c;
                all.push(chunk);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = iterable_1.return)) await _b.call(iterable_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return all;
    };
}
/**
 * Creates an AsyncIterableSink that concatenates all chunks from the input into
 * a single Uint8Array.
 *
 * The iterable raises an error if the more than readMaxBytes are read.
 *
 * An optional length hint can be provided to optimize allocation and validation.
 * If more or less bytes are present in the source that the length hint indicates,
 * and error is raised.
 * If the length hint is larger than readMaxBytes, an error is raised.
 * If the length hint is not a positive integer, it is ignored.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function sinkAllBytes(readMaxBytes, lengthHint) {
    return async function (iterable) {
        return await readAllBytes(iterable, readMaxBytes, lengthHint);
    };
}
function pipe(source, ...rest) {
    return __asyncGenerator(this, arguments, function* pipe_1() {
        var _a;
        const [transforms, opt] = pickTransforms(rest);
        let abortable;
        const sourceIt = source[Symbol.asyncIterator]();
        const cachedSource = {
            [Symbol.asyncIterator]() {
                return sourceIt;
            },
        };
        let iterable = cachedSource;
        if ((opt === null || opt === void 0 ? void 0 : opt.propagateDownStreamError) === true) {
            iterable = abortable = makeIterableAbortable(iterable);
        }
        for (const t of transforms) {
            iterable = t(iterable);
        }
        const it = iterable[Symbol.asyncIterator]();
        try {
            for (;;) {
                const r = yield __await(it.next());
                if (r.done === true) {
                    break;
                }
                if (!abortable) {
                    yield yield __await(r.value);
                    continue;
                }
                try {
                    yield yield __await(r.value);
                }
                catch (e) {
                    yield __await(abortable.abort(e)); // propagate downstream error to the source
                    throw e;
                }
            }
        }
        finally {
            if ((opt === null || opt === void 0 ? void 0 : opt.propagateDownStreamError) === true) {
                // Call return on the source iterable to indicate
                // that we will no longer consume it and it should
                // cleanup any allocated resources.
                (_a = sourceIt.return) === null || _a === void 0 ? void 0 : _a.call(sourceIt).catch(() => {
                    // return returns a promise, which we don't care about.
                    //
                    // Uncaught promises are thrown at sometime/somewhere by the event loop,
                    // this is to ensure error is caught and ignored.
                });
            }
        }
    });
}
function pickTransforms(rest) {
    let opt;
    if (typeof rest[rest.length - 1] != "function") {
        opt = rest.pop();
    }
    return [rest, opt];
}
/**
 * Creates an AsyncIterableTransform that catches any error from the input, and
 * passes it to the given catchError function.
 *
 * The catchError function may return a final value.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformCatch(catchError) {
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            // we deliberate avoid a for-await loop because we only want to catch upstream
            // errors, not downstream errors (yield).
            const it = iterable[Symbol.asyncIterator]();
            for (;;) {
                let r;
                try {
                    r = yield __await(it.next());
                }
                catch (e) {
                    const caught = yield __await(catchError(e));
                    if (caught !== undefined) {
                        yield yield __await(caught);
                    }
                    break;
                }
                if (r.done === true) {
                    break;
                }
                yield yield __await(r.value);
            }
        });
    };
}
/**
 * Creates an AsyncIterableTransform that catches any error from the input, and
 * passes it to the given function. Unlike transformCatch(), the given function
 * is also called when no error is raised.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformCatchFinally(catchFinally) {
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            // we deliberate avoid a for-await loop because we only want to catch upstream
            // errors, not downstream errors (yield).
            let err;
            const it = iterable[Symbol.asyncIterator]();
            for (;;) {
                let r;
                try {
                    r = yield __await(it.next());
                }
                catch (e) {
                    err = e;
                    break;
                }
                if (r.done === true) {
                    break;
                }
                yield yield __await(r.value);
            }
            const caught = yield __await(catchFinally(err));
            if (caught !== undefined) {
                yield yield __await(caught);
            }
        });
    };
}
/**
 * Creates an AsyncIterableTransform that appends a value.
 *
 * The element to append is provided by a function. If the function returns
 * undefined, no element is appended.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformAppend(provide) {
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            var _a, e_2, _b, _c;
            try {
                for (var _d = true, iterable_2 = __asyncValues(iterable), iterable_2_1; iterable_2_1 = yield __await(iterable_2.next()), _a = iterable_2_1.done, !_a; _d = true) {
                    _c = iterable_2_1.value;
                    _d = false;
                    const chunk = _c;
                    yield yield __await(chunk);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_2.return)) yield __await(_b.call(iterable_2));
                }
                finally { if (e_2) throw e_2.error; }
            }
            const append = yield __await(provide());
            if (append !== undefined) {
                yield yield __await(append);
            }
        });
    };
}
/**
 * Creates an AsyncIterableTransform that prepends an element.
 *
 * The element to prepend is provided by a function. If the function returns
 * undefined, no element is appended.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformPrepend(provide) {
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            var _a, e_3, _b, _c;
            const prepend = yield __await(provide());
            if (prepend !== undefined) {
                yield yield __await(prepend);
            }
            try {
                for (var _d = true, iterable_3 = __asyncValues(iterable), iterable_3_1; iterable_3_1 = yield __await(iterable_3.next()), _a = iterable_3_1.done, !_a; _d = true) {
                    _c = iterable_3_1.value;
                    _d = false;
                    const chunk = _c;
                    yield yield __await(chunk);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_3.return)) yield __await(_b.call(iterable_3));
                }
                finally { if (e_3) throw e_3.error; }
            }
        });
    };
}
/**
 * Creates an AsyncIterableTransform that reads all bytes from the input, and
 * concatenates them to a single Uint8Array.
 *
 * The iterable raises an error if the more than readMaxBytes are read.
 *
 * An optional length hint can be provided to optimize allocation and validation.
 * If more or less bytes are present in the source that the length hint indicates,
 * and error is raised.
 * If the length hint is larger than readMaxBytes, an error is raised.
 * If the length hint is not a positive integer, it is ignored.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformReadAllBytes(readMaxBytes, lengthHint) {
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            yield yield __await(yield __await(readAllBytes(iterable, readMaxBytes, lengthHint)));
        });
    };
}
function transformSerializeEnvelope(serialization, endStreamFlag, endSerialization) {
    if (endStreamFlag === undefined || endSerialization === undefined) {
        return function (iterable) {
            return __asyncGenerator(this, arguments, function* () {
                var _a, e_4, _b, _c;
                try {
                    for (var _d = true, iterable_4 = __asyncValues(iterable), iterable_4_1; iterable_4_1 = yield __await(iterable_4.next()), _a = iterable_4_1.done, !_a; _d = true) {
                        _c = iterable_4_1.value;
                        _d = false;
                        const chunk = _c;
                        const data = serialization.serialize(chunk);
                        yield yield __await({ flags: 0, data });
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = iterable_4.return)) yield __await(_b.call(iterable_4));
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            });
        };
    }
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            var _a, e_5, _b, _c;
            try {
                for (var _d = true, iterable_5 = __asyncValues(iterable), iterable_5_1; iterable_5_1 = yield __await(iterable_5.next()), _a = iterable_5_1.done, !_a; _d = true) {
                    _c = iterable_5_1.value;
                    _d = false;
                    const chunk = _c;
                    let data;
                    let flags = 0;
                    if (chunk.end) {
                        flags = flags | endStreamFlag;
                        data = endSerialization.serialize(chunk.value);
                    }
                    else {
                        data = serialization.serialize(chunk.value);
                    }
                    yield yield __await({ flags, data });
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_5.return)) yield __await(_b.call(iterable_5));
                }
                finally { if (e_5) throw e_5.error; }
            }
        });
    };
}
function transformParseEnvelope(serialization, endStreamFlag, endSerialization) {
    // code path always yields ParsedEnvelopedMessage<T, E>
    if (endSerialization && endStreamFlag !== undefined) {
        return function (iterable) {
            return __asyncGenerator(this, arguments, function* () {
                var _a, e_6, _b, _c;
                try {
                    for (var _d = true, iterable_6 = __asyncValues(iterable), iterable_6_1; iterable_6_1 = yield __await(iterable_6.next()), _a = iterable_6_1.done, !_a; _d = true) {
                        _c = iterable_6_1.value;
                        _d = false;
                        const { flags, data } = _c;
                        if ((flags & endStreamFlag) === endStreamFlag) {
                            yield yield __await({ value: endSerialization.parse(data), end: true });
                        }
                        else {
                            yield yield __await({ value: serialization.parse(data), end: false });
                        }
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = iterable_6.return)) yield __await(_b.call(iterable_6));
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            });
        };
    }
    // code path always yields T
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            var _a, e_7, _b, _c;
            try {
                for (var _d = true, iterable_7 = __asyncValues(iterable), iterable_7_1; iterable_7_1 = yield __await(iterable_7.next()), _a = iterable_7_1.done, !_a; _d = true) {
                    _c = iterable_7_1.value;
                    _d = false;
                    const { flags, data } = _c;
                    if (endStreamFlag !== undefined &&
                        (flags & endStreamFlag) === endStreamFlag) {
                        if (endSerialization === null) {
                            throw new connect_error_js_1.ConnectError("unexpected end flag", code_js_1.Code.InvalidArgument);
                        }
                        // skips end-of-stream envelope
                        continue;
                    }
                    yield yield __await(serialization.parse(data));
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_7.return)) yield __await(_b.call(iterable_7));
                }
                finally { if (e_7) throw e_7.error; }
            }
        });
    };
}
/**
 * Creates an AsyncIterableTransform that takes enveloped messages as a source,
 * and compresses them if they are larger than compressMinBytes.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformCompressEnvelope(compression, compressMinBytes) {
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            var _a, e_8, _b, _c;
            try {
                for (var _d = true, iterable_8 = __asyncValues(iterable), iterable_8_1; iterable_8_1 = yield __await(iterable_8.next()), _a = iterable_8_1.done, !_a; _d = true) {
                    _c = iterable_8_1.value;
                    _d = false;
                    const env = _c;
                    yield yield __await(yield __await((0, envelope_js_1.envelopeCompress)(env, compression, compressMinBytes)));
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_8.return)) yield __await(_b.call(iterable_8));
                }
                finally { if (e_8) throw e_8.error; }
            }
        });
    };
}
/**
 * Creates an AsyncIterableTransform that takes enveloped messages as a source,
 * and decompresses them using the given compression.
 *
 * The iterable raises an error if the decompressed payload of an enveloped
 * message is larger than readMaxBytes, or if no compression is provided.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformDecompressEnvelope(compression, readMaxBytes) {
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            var _a, e_9, _b, _c;
            try {
                for (var _d = true, iterable_9 = __asyncValues(iterable), iterable_9_1; iterable_9_1 = yield __await(iterable_9.next()), _a = iterable_9_1.done, !_a; _d = true) {
                    _c = iterable_9_1.value;
                    _d = false;
                    const env = _c;
                    yield yield __await(yield __await((0, envelope_js_1.envelopeDecompress)(env, compression, readMaxBytes)));
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_9.return)) yield __await(_b.call(iterable_9));
                }
                finally { if (e_9) throw e_9.error; }
            }
        });
    };
}
/**
 * Create an AsyncIterableTransform that takes enveloped messages as a source,
 * and joins them into a stream of raw bytes.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformJoinEnvelopes() {
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            var _a, e_10, _b, _c;
            try {
                for (var _d = true, iterable_10 = __asyncValues(iterable), iterable_10_1; iterable_10_1 = yield __await(iterable_10.next()), _a = iterable_10_1.done, !_a; _d = true) {
                    _c = iterable_10_1.value;
                    _d = false;
                    const { flags, data } = _c;
                    yield yield __await((0, envelope_js_1.encodeEnvelope)(flags, data));
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_10.return)) yield __await(_b.call(iterable_10));
                }
                finally { if (e_10) throw e_10.error; }
            }
        });
    };
}
/**
 * Create an AsyncIterableTransform that takes raw bytes as a source, and splits
 * them into enveloped messages.
 *
 * The iterable raises an error
 * - if the payload of an enveloped message is larger than readMaxBytes,
 * - if the stream ended before an enveloped message fully arrived,
 * - or if the stream ended with extraneous data.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformSplitEnvelope(readMaxBytes) {
    // append chunk to buffer, returning updated buffer
    function append(buffer, chunk) {
        const n = new Uint8Array(buffer.byteLength + chunk.byteLength);
        n.set(buffer);
        n.set(chunk, buffer.length);
        return n;
    }
    // tuple 0: envelope, or undefined if incomplete
    // tuple 1: remainder of the buffer
    function shiftEnvelope(buffer, header) {
        if (buffer.byteLength < 5 + header.length) {
            return [undefined, buffer];
        }
        return [
            { flags: header.flags, data: buffer.subarray(5, 5 + header.length) },
            buffer.subarray(5 + header.length),
        ];
    }
    // undefined: header is incomplete
    function peekHeader(buffer) {
        if (buffer.byteLength < 5) {
            return undefined;
        }
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const length = view.getUint32(1); // 4 bytes message length
        const flags = view.getUint8(0); // first byte is flags
        return { length, flags };
    }
    return function (iterable) {
        return __asyncGenerator(this, arguments, function* () {
            var _a, e_11, _b, _c;
            let buffer = new Uint8Array(0);
            try {
                for (var _d = true, iterable_11 = __asyncValues(iterable), iterable_11_1; iterable_11_1 = yield __await(iterable_11.next()), _a = iterable_11_1.done, !_a; _d = true) {
                    _c = iterable_11_1.value;
                    _d = false;
                    const chunk = _c;
                    buffer = append(buffer, chunk);
                    for (;;) {
                        const header = peekHeader(buffer);
                        if (!header) {
                            break;
                        }
                        (0, limit_io_js_1.assertReadMaxBytes)(readMaxBytes, header.length, true);
                        let env;
                        [env, buffer] = shiftEnvelope(buffer, header);
                        if (!env) {
                            break;
                        }
                        yield yield __await(env);
                    }
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_11.return)) yield __await(_b.call(iterable_11));
                }
                finally { if (e_11) throw e_11.error; }
            }
            if (buffer.byteLength > 0) {
                const header = peekHeader(buffer);
                let message = "protocol error: incomplete envelope";
                if (header) {
                    message = `protocol error: promised ${header.length} bytes in enveloped message, got ${buffer.byteLength - 5} bytes`;
                }
                throw new connect_error_js_1.ConnectError(message, code_js_1.Code.InvalidArgument);
            }
        });
    };
}
/**
 * Reads all bytes from the source, and concatenates them to a single Uint8Array.
 *
 * Raises an error if:
 * - more than readMaxBytes are read
 * - lengthHint is a positive integer, but larger than readMaxBytes
 * - lengthHint is a positive integer, and the source contains more or less bytes
 *   than promised
 *
 * @private Internal code, does not follow semantic versioning.
 */
async function readAllBytes(iterable, readMaxBytes, lengthHint) {
    var _a, e_12, _b, _c, _d, e_13, _e, _f;
    const [ok, hint] = parseLengthHint(lengthHint);
    if (ok) {
        if (hint > readMaxBytes) {
            (0, limit_io_js_1.assertReadMaxBytes)(readMaxBytes, hint, true);
        }
        const buffer = new Uint8Array(hint);
        let offset = 0;
        try {
            for (var _g = true, iterable_12 = __asyncValues(iterable), iterable_12_1; iterable_12_1 = await iterable_12.next(), _a = iterable_12_1.done, !_a; _g = true) {
                _c = iterable_12_1.value;
                _g = false;
                const chunk = _c;
                if (offset + chunk.byteLength > hint) {
                    throw new connect_error_js_1.ConnectError(`protocol error: promised ${hint} bytes, received ${offset + chunk.byteLength}`, code_js_1.Code.InvalidArgument);
                }
                buffer.set(chunk, offset);
                offset += chunk.byteLength;
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (!_g && !_a && (_b = iterable_12.return)) await _b.call(iterable_12);
            }
            finally { if (e_12) throw e_12.error; }
        }
        if (offset < hint) {
            throw new connect_error_js_1.ConnectError(`protocol error: promised ${hint} bytes, received ${offset}`, code_js_1.Code.InvalidArgument);
        }
        return buffer;
    }
    const chunks = [];
    let count = 0;
    try {
        for (var _h = true, iterable_13 = __asyncValues(iterable), iterable_13_1; iterable_13_1 = await iterable_13.next(), _d = iterable_13_1.done, !_d; _h = true) {
            _f = iterable_13_1.value;
            _h = false;
            const chunk = _f;
            count += chunk.byteLength;
            (0, limit_io_js_1.assertReadMaxBytes)(readMaxBytes, count);
            chunks.push(chunk);
        }
    }
    catch (e_13_1) { e_13 = { error: e_13_1 }; }
    finally {
        try {
            if (!_h && !_d && (_e = iterable_13.return)) await _e.call(iterable_13);
        }
        finally { if (e_13) throw e_13.error; }
    }
    const all = new Uint8Array(count);
    let offset = 0;
    for (let chunk = chunks.shift(); chunk; chunk = chunks.shift()) {
        all.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return all;
}
// parse the lengthHint argument of readAllBytes()
function parseLengthHint(lengthHint) {
    if (lengthHint === undefined || lengthHint === null) {
        return [false, 0];
    }
    const n = typeof lengthHint == "string" ? parseInt(lengthHint, 10) : lengthHint;
    if (!Number.isSafeInteger(n) || n < 0) {
        return [false, n];
    }
    return [true, n];
}
/**
 * Wait for the first element of an iterable without modifying the iterable.
 * This consumes the first element, but pushes it back on the stack.
 *
 * @private Internal code, does not follow semantic versioning.
 */
async function untilFirst(iterable) {
    const it = iterable[Symbol.asyncIterator]();
    let first = await it.next();
    return {
        [Symbol.asyncIterator]() {
            const w = {
                async next() {
                    if (first !== null) {
                        const n = first;
                        first = null;
                        return n;
                    }
                    return await it.next();
                },
            };
            if (it.throw !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- can't handle mutated object sensibly
                w.throw = (e) => it.throw(e);
            }
            if (it.return !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-explicit-any -- can't handle mutated object sensibly
                w.return = (value) => it.return(value);
            }
            return w;
        },
    };
}
/**
 * Wrap the given iterable and return an iterable with an abort() method.
 *
 * This function exists purely for convenience. Where one would typically have
 * to access the iterator directly, advance through all elements, and call
 * AsyncIterator.throw() to notify the upstream iterable, this function allows
 * to use convenient for-await loops and still notify the upstream iterable:
 *
 * ```ts
 * const abortable = makeIterableAbortable(iterable);
 * for await (const ele of abortable) {
 *   await abortable.abort("ERR");
 * }
 * ```
 * There are a couple of limitations of this function:
 * - the given async iterable must implement throw
 * - the async iterable cannot be re-use
 * - if source catches errors and yields values for them, they are ignored, and
 *   the source may still dangle
 *
 * There are four possible ways an async function* can handle yield errors:
 * 1. don't catch errors at all - Abortable.abort() will resolve "rethrown"
 * 2. catch errors and rethrow - Abortable.abort() will resolve "rethrown"
 * 3. catch errors and return - Abortable.abort() will resolve "completed"
 * 4. catch errors and yield a value - Abortable.abort() will resolve "caught"
 *
 * Note that catching errors and yielding a value is problematic, and it should
 * be documented that this may leave the source in a dangling state.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function makeIterableAbortable(iterable) {
    const innerCandidate = iterable[Symbol.asyncIterator]();
    if (innerCandidate.throw === undefined) {
        throw new Error("AsyncIterable does not implement throw");
    }
    const inner = innerCandidate;
    let aborted;
    let resultPromise;
    let it = {
        next() {
            resultPromise = inner.next().finally(() => {
                resultPromise = undefined;
            });
            return resultPromise;
        },
        throw(e) {
            return inner.throw(e);
        },
    };
    if (innerCandidate.return !== undefined) {
        it = Object.assign(Object.assign({}, it), { return(value) {
                return inner.return(value);
            } });
    }
    let used = false;
    return {
        abort(reason) {
            if (aborted) {
                return aborted.state;
            }
            const f = () => {
                return inner.throw(reason).then((r) => (r.done === true ? "completed" : "caught"), () => "rethrown");
            };
            if (resultPromise) {
                aborted = { reason, state: resultPromise.then(f, f) };
                return aborted.state;
            }
            aborted = { reason, state: f() };
            return aborted.state;
        },
        [Symbol.asyncIterator]() {
            if (used) {
                throw new Error("AsyncIterable cannot be re-used");
            }
            used = true;
            return it;
        },
    };
}
/**
 * Create a new WritableIterable.
 */
function createWritableIterable() {
    // We start with two queues to capture the read and write attempts.
    //
    // The writes and reads each check of their counterpart is
    // already available and either interact/add themselves to the queue.
    const readQueue = [];
    const writeQueue = [];
    let err = undefined;
    let nextResolve;
    let nextReject;
    let nextPromise = new Promise((resolve, reject) => {
        nextResolve = resolve;
        nextReject = reject;
    });
    let closed = false;
    // drain the readQueue in case of error/writer is closed by sending a
    // done result.
    function drain() {
        for (const next of readQueue.splice(0, readQueue.length)) {
            next({ done: true, value: undefined });
        }
    }
    return {
        close() {
            closed = true;
            drain();
        },
        async write(payload) {
            if (closed) {
                throw err !== null && err !== void 0 ? err : new Error("cannot write, WritableIterable already closed");
            }
            const read = readQueue.shift();
            if (read === undefined) {
                // We didn't find a pending read so we add the payload to the write queue.
                writeQueue.push(payload);
            }
            else {
                // We found a pending read so we respond with the payload.
                read({ done: false, value: payload });
                if (readQueue.length > 0) {
                    // If there are more in the read queue we can mark the write as complete.
                    // as the error reporting is not guaranteed to be sequential and therefore cannot
                    // to linked to a specific write.
                    return;
                }
            }
            // We await the next call for as many times as there are items in the queue + 1
            //
            // If there are no items in the write queue that means write happened and we just have
            // to wait for one more call likewise if we are the nth write in the queue we
            // have to wait for n writes to complete and one more.
            const limit = writeQueue.length + 1;
            for (let i = 0; i < limit; i++) {
                await nextPromise;
            }
        },
        [Symbol.asyncIterator]() {
            return {
                next() {
                    // Resolve the nextPromise to indicate
                    // pending writes that a read attempt has been made
                    // after their write.
                    //
                    // We also need to reset the promise for future writes.
                    nextResolve();
                    nextPromise = new Promise((resolve, reject) => {
                        nextResolve = resolve;
                        nextReject = reject;
                    });
                    const write = writeQueue.shift();
                    if (write !== undefined) {
                        // We found a pending write so response with the payload.
                        return Promise.resolve({ done: false, value: write });
                    }
                    if (closed) {
                        return Promise.resolve({ done: true, value: undefined });
                    }
                    // We return a promise immediately that is either resolved/rejected
                    // as writes happen.
                    let readResolve;
                    const readPromise = new Promise((resolve) => (readResolve = resolve));
                    readQueue.push(readResolve); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                    return readPromise;
                },
                throw(throwErr) {
                    err = throwErr;
                    closed = true;
                    writeQueue.splice(0, writeQueue.length);
                    nextPromise.catch(() => {
                        // To make sure that the nextPromise is always resolved.
                    });
                    // This will reject all pending writes.
                    nextReject(err);
                    drain();
                    return Promise.resolve({ done: true, value: undefined });
                },
                return() {
                    closed = true;
                    writeQueue.splice(0, writeQueue.length);
                    // Resolve once for the write awaiting confirmation.
                    nextResolve();
                    // Reject all future writes.
                    nextPromise = Promise.reject(new Error("cannot write, consumer called return"));
                    nextPromise.catch(() => {
                        // To make sure that the nextPromise is always resolved.
                    });
                    drain();
                    return Promise.resolve({ done: true, value: undefined });
                },
            };
        },
    };
}
/**
 * Create an asynchronous iterable from an array.
 *
 * @private Internal code, does not follow semantic versioning.
 */
// eslint-disable-next-line @typescript-eslint/require-await
function createAsyncIterable(items) {
    return __asyncGenerator(this, arguments, function* createAsyncIterable_1() {
        yield __await(yield* __asyncDelegator(__asyncValues(items)));
    });
}


/***/ }),
/* 62 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createEnvelopeReadableStream = createEnvelopeReadableStream;
exports.envelopeCompress = envelopeCompress;
exports.envelopeDecompress = envelopeDecompress;
exports.encodeEnvelope = encodeEnvelope;
exports.encodeEnvelopes = encodeEnvelopes;
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
const compression_js_1 = __webpack_require__(63);
/**
 * Create a WHATWG ReadableStream of enveloped messages from a ReadableStream
 * of bytes.
 *
 * Ideally, this would simply be a TransformStream, but ReadableStream.pipeThrough
 * does not have the necessary availability at this time.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createEnvelopeReadableStream(stream) {
    let reader;
    let buffer = new Uint8Array(0);
    function append(chunk) {
        const n = new Uint8Array(buffer.length + chunk.length);
        n.set(buffer);
        n.set(chunk, buffer.length);
        buffer = n;
    }
    return new ReadableStream({
        start() {
            reader = stream.getReader();
        },
        async pull(controller) {
            let header = undefined;
            for (;;) {
                if (header === undefined && buffer.byteLength >= 5) {
                    let length = 0;
                    for (let i = 1; i < 5; i++) {
                        length = (length << 8) + buffer[i];
                    }
                    header = { flags: buffer[0], length };
                }
                if (header !== undefined && buffer.byteLength >= header.length + 5) {
                    break;
                }
                const result = await reader.read();
                if (result.done) {
                    break;
                }
                append(result.value);
            }
            if (header === undefined) {
                if (buffer.byteLength == 0) {
                    controller.close();
                    return;
                }
                controller.error(new connect_error_js_1.ConnectError("premature end of stream", code_js_1.Code.DataLoss));
                return;
            }
            const data = buffer.subarray(5, 5 + header.length);
            buffer = buffer.subarray(5 + header.length);
            controller.enqueue({
                flags: header.flags,
                data,
            });
        },
    });
}
/**
 * Compress an EnvelopedMessage.
 *
 * Raises Internal if an enveloped message is already compressed.
 *
 * @private Internal code, does not follow semantic versioning.
 */
async function envelopeCompress(envelope, compression, compressMinBytes) {
    let { flags, data } = envelope;
    if ((flags & compression_js_1.compressedFlag) === compression_js_1.compressedFlag) {
        throw new connect_error_js_1.ConnectError("invalid envelope, already compressed", code_js_1.Code.Internal);
    }
    if (compression && data.byteLength >= compressMinBytes) {
        data = await compression.compress(data);
        flags = flags | compression_js_1.compressedFlag;
    }
    return { data, flags };
}
/**
 * Decompress an EnvelopedMessage.
 *
 * Raises InvalidArgument if an envelope is compressed, but compression is null.
 *
 * Relies on the provided Compression to raise ResourceExhausted if the
 * *decompressed* message size is larger than readMaxBytes. If the envelope is
 * not compressed, readMaxBytes is not honored.
 *
 * @private Internal code, does not follow semantic versioning.
 */
async function envelopeDecompress(envelope, compression, readMaxBytes) {
    let { flags, data } = envelope;
    if ((flags & compression_js_1.compressedFlag) === compression_js_1.compressedFlag) {
        if (!compression) {
            throw new connect_error_js_1.ConnectError("received compressed envelope, but do not know how to decompress", code_js_1.Code.Internal);
        }
        data = await compression.decompress(data, readMaxBytes);
        flags = flags ^ compression_js_1.compressedFlag;
    }
    return { data, flags };
}
/**
 * Encode a single enveloped message.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function encodeEnvelope(flags, data) {
    const bytes = new Uint8Array(data.length + 5);
    bytes.set(data, 5);
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    v.setUint8(0, flags); // first byte is flags
    v.setUint32(1, data.length); // 4 bytes message length
    return bytes;
}
/**
 * Encode a set of enveloped messages.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function encodeEnvelopes(...envelopes) {
    const len = envelopes.reduce((previousValue, currentValue) => previousValue + currentValue.data.length + 5, 0);
    const bytes = new Uint8Array(len);
    const v = new DataView(bytes.buffer);
    let offset = 0;
    for (const e of envelopes) {
        v.setUint8(offset, e.flags); // first byte is flags
        v.setUint32(offset + 1, e.data.length); // 4 bytes message length
        bytes.set(e.data, offset + 5);
        offset += e.data.length + 5;
    }
    return bytes;
}


/***/ }),
/* 63 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.compressedFlag = void 0;
exports.compressionNegotiate = compressionNegotiate;
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
/**
 * compressedFlag indicates that the data in a EnvelopedMessage is
 * compressed. It has the same meaning in the gRPC-Web, gRPC-HTTP2,
 * and Connect protocols.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.compressedFlag = 0b00000001;
/**
 * Validates the request encoding and determines the accepted response encoding.
 *
 * Returns the request and response compression to use. If the client requested
 * an encoding that is not available, the returned object contains an error that
 * must be used for the response.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function compressionNegotiate(available, requested, // e.g. the value of the Grpc-Encoding header
accepted, // e.g. the value of the Grpc-Accept-Encoding header
headerNameAcceptEncoding) {
    let request = null;
    let response = null;
    let error = undefined;
    if (requested !== null && requested !== "identity") {
        const found = available.find((c) => c.name === requested);
        if (found) {
            request = found;
        }
        else {
            // To comply with https://github.com/grpc/grpc/blob/master/doc/compression.md
            // and the Connect protocol, we return code "unimplemented" and specify
            // acceptable compression(s).
            const acceptable = available.map((c) => c.name).join(",");
            error = new connect_error_js_1.ConnectError(`unknown compression "${requested}": supported encodings are ${acceptable}`, code_js_1.Code.Unimplemented, {
                [headerNameAcceptEncoding]: acceptable,
            });
        }
    }
    if (accepted === null || accepted === "") {
        // Support asymmetric compression. This logic follows
        // https://github.com/grpc/grpc/blob/master/doc/compression.md and common
        // sense.
        response = request;
    }
    else {
        const acceptNames = accepted.split(",").map((n) => n.trim());
        for (const name of acceptNames) {
            const found = available.find((c) => c.name === name);
            if (found) {
                response = found;
                break;
            }
        }
    }
    return { request, response, error };
}


/***/ }),
/* 64 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.validateReadWriteMaxBytes = validateReadWriteMaxBytes;
exports.assertWriteMaxBytes = assertWriteMaxBytes;
exports.assertReadMaxBytes = assertReadMaxBytes;
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
/**
 * At most, allow ~4GiB to be received or sent per message.
 * zlib used by Node.js caps maxOutputLength at this value. It also happens to
 * be the maximum theoretical message size supported by protobuf-es.
 */
const maxReadMaxBytes = 0xffffffff;
const maxWriteMaxBytes = maxReadMaxBytes;
/**
 * The default value for the compressMinBytes option. The CPU cost of compressing
 * very small messages usually isn't worth the small reduction in network I/O, so
 * the default value is 1 kibibyte.
 */
const defaultCompressMinBytes = 1024;
/**
 * Asserts that the options writeMaxBytes, readMaxBytes, and compressMinBytes
 * are within sane limits, and returns default values where no value is
 * provided.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function validateReadWriteMaxBytes(readMaxBytes, writeMaxBytes, compressMinBytes) {
    writeMaxBytes !== null && writeMaxBytes !== void 0 ? writeMaxBytes : (writeMaxBytes = maxWriteMaxBytes);
    readMaxBytes !== null && readMaxBytes !== void 0 ? readMaxBytes : (readMaxBytes = maxReadMaxBytes);
    compressMinBytes !== null && compressMinBytes !== void 0 ? compressMinBytes : (compressMinBytes = defaultCompressMinBytes);
    if (writeMaxBytes < 1 || writeMaxBytes > maxWriteMaxBytes) {
        throw new connect_error_js_1.ConnectError(`writeMaxBytes ${writeMaxBytes} must be >= 1 and <= ${maxWriteMaxBytes}`, code_js_1.Code.Internal);
    }
    if (readMaxBytes < 1 || readMaxBytes > maxReadMaxBytes) {
        throw new connect_error_js_1.ConnectError(`readMaxBytes ${readMaxBytes} must be >= 1 and <= ${maxReadMaxBytes}`, code_js_1.Code.Internal);
    }
    return {
        readMaxBytes,
        writeMaxBytes,
        compressMinBytes,
    };
}
/**
 * Raise an error ResourceExhausted if more than writeMaxByte are written.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function assertWriteMaxBytes(writeMaxBytes, bytesWritten) {
    if (bytesWritten > writeMaxBytes) {
        throw new connect_error_js_1.ConnectError(`message size ${bytesWritten} is larger than configured writeMaxBytes ${writeMaxBytes}`, code_js_1.Code.ResourceExhausted);
    }
}
/**
 * Raise an error ResourceExhausted if more than readMaxBytes are read.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function assertReadMaxBytes(readMaxBytes, bytesRead, totalSizeKnown = false) {
    if (bytesRead > readMaxBytes) {
        let message = `message size is larger than configured readMaxBytes ${readMaxBytes}`;
        if (totalSizeKnown) {
            message = `message size ${bytesRead} is larger than configured readMaxBytes ${readMaxBytes}`;
        }
        throw new connect_error_js_1.ConnectError(message, code_js_1.Code.ResourceExhausted);
    }
}


/***/ }),
/* 65 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createClient = createClient;
exports.createPromiseClient = createPromiseClient;
exports.createUnaryFn = createUnaryFn;
exports.createServerStreamingFn = createServerStreamingFn;
exports.createClientStreamingFn = createClientStreamingFn;
exports.createBiDiStreamingFn = createBiDiStreamingFn;
const protobuf_1 = __webpack_require__(10);
const any_client_js_1 = __webpack_require__(60);
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
const async_iterable_js_1 = __webpack_require__(61);
/**
 * Create a Client for the given service, invoking RPCs through the
 * given transport.
 */
function createClient(service, transport) {
    return (0, any_client_js_1.makeAnyClient)(service, (method) => {
        switch (method.kind) {
            case protobuf_1.MethodKind.Unary:
                return createUnaryFn(transport, service, method);
            case protobuf_1.MethodKind.ServerStreaming:
                return createServerStreamingFn(transport, service, method);
            case protobuf_1.MethodKind.ClientStreaming:
                return createClientStreamingFn(transport, service, method);
            case protobuf_1.MethodKind.BiDiStreaming:
                return createBiDiStreamingFn(transport, service, method);
            default:
                return null;
        }
    });
}
/**
 * @deprecated use createClient.
 */
function createPromiseClient(service, transport) {
    return createClient(service, transport);
}
function createUnaryFn(transport, service, method) {
    return async function (input, options) {
        var _a, _b;
        const response = await transport.unary(service, method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, input, options === null || options === void 0 ? void 0 : options.contextValues);
        (_a = options === null || options === void 0 ? void 0 : options.onHeader) === null || _a === void 0 ? void 0 : _a.call(options, response.header);
        (_b = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _b === void 0 ? void 0 : _b.call(options, response.trailer);
        return response.message;
    };
}
function createServerStreamingFn(transport, service, method) {
    return function (input, options) {
        return handleStreamResponse(transport.stream(service, method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, (0, async_iterable_js_1.createAsyncIterable)([input]), options === null || options === void 0 ? void 0 : options.contextValues), options);
    };
}
function createClientStreamingFn(transport, service, method) {
    return async function (request, options) {
        var _a, e_1, _b, _c;
        var _d, _e;
        const response = await transport.stream(service, method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, request, options === null || options === void 0 ? void 0 : options.contextValues);
        (_d = options === null || options === void 0 ? void 0 : options.onHeader) === null || _d === void 0 ? void 0 : _d.call(options, response.header);
        let singleMessage;
        let count = 0;
        try {
            for (var _f = true, _g = __asyncValues(response.message), _h; _h = await _g.next(), _a = _h.done, !_a; _f = true) {
                _c = _h.value;
                _f = false;
                const message = _c;
                singleMessage = message;
                count++;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_f && !_a && (_b = _g.return)) await _b.call(_g);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (!singleMessage) {
            throw new connect_error_js_1.ConnectError("protocol error: missing response message", code_js_1.Code.Unimplemented);
        }
        if (count > 1) {
            throw new connect_error_js_1.ConnectError("protocol error: received extra messages for client streaming method", code_js_1.Code.Unimplemented);
        }
        (_e = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _e === void 0 ? void 0 : _e.call(options, response.trailer);
        return singleMessage;
    };
}
function createBiDiStreamingFn(transport, service, method) {
    return function (request, options) {
        return handleStreamResponse(transport.stream(service, method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, request, options === null || options === void 0 ? void 0 : options.contextValues), options);
    };
}
function handleStreamResponse(stream, options) {
    const it = (function () {
        return __asyncGenerator(this, arguments, function* () {
            var _a, _b;
            const response = yield __await(stream);
            (_a = options === null || options === void 0 ? void 0 : options.onHeader) === null || _a === void 0 ? void 0 : _a.call(options, response.header);
            yield __await(yield* __asyncDelegator(__asyncValues(response.message)));
            (_b = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _b === void 0 ? void 0 : _b.call(options, response.trailer);
        });
    })()[Symbol.asyncIterator]();
    // Create a new iterable to omit throw/return.
    return {
        [Symbol.asyncIterator]: () => ({
            next: () => it.next(),
        }),
    };
}


/***/ }),
/* 66 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createConnectRouter = createConnectRouter;
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
const implementation_js_1 = __webpack_require__(67);
const handler_factory_js_1 = __webpack_require__(70);
const handler_factory_js_2 = __webpack_require__(86);
const handler_factory_js_3 = __webpack_require__(88);
const universal_handler_js_1 = __webpack_require__(84);
/**
 * Create a new ConnectRouter.
 */
function createConnectRouter(routerOptions) {
    const base = whichProtocols(routerOptions);
    const handlers = [];
    return {
        handlers,
        service(service, implementation, options) {
            const { protocols } = whichProtocols(options, base);
            handlers.push(...(0, universal_handler_js_1.createUniversalServiceHandlers)((0, implementation_js_1.createServiceImplSpec)(service, implementation), protocols));
            return this;
        },
        rpc(serviceOrMethod, methodOrImpl, implementationOrOptions, options) {
            let service;
            let method;
            let impl;
            let opt;
            if ("typeName" in serviceOrMethod) {
                service = serviceOrMethod;
                method = methodOrImpl;
                impl = implementationOrOptions;
                opt = options;
            }
            else {
                service = Object.assign(Object.assign({}, serviceOrMethod.service), { methods: {} });
                method = serviceOrMethod;
                impl = methodOrImpl;
                opt = implementationOrOptions;
            }
            const { protocols } = whichProtocols(opt, base);
            handlers.push((0, universal_handler_js_1.createUniversalMethodHandler)((0, implementation_js_1.createMethodImplSpec)(service, method, impl), protocols));
            return this;
        },
    };
}
function whichProtocols(options, base) {
    if (base && !options) {
        return base;
    }
    const opt = base
        ? Object.assign(Object.assign({}, (0, universal_handler_js_1.validateUniversalHandlerOptions)(base.options)), options) : Object.assign(Object.assign({}, options), (0, universal_handler_js_1.validateUniversalHandlerOptions)(options !== null && options !== void 0 ? options : {}));
    const protocols = [];
    if ((options === null || options === void 0 ? void 0 : options.grpc) !== false) {
        protocols.push((0, handler_factory_js_2.createHandlerFactory)(opt));
    }
    if ((options === null || options === void 0 ? void 0 : options.grpcWeb) !== false) {
        protocols.push((0, handler_factory_js_1.createHandlerFactory)(opt));
    }
    if ((options === null || options === void 0 ? void 0 : options.connect) !== false) {
        protocols.push((0, handler_factory_js_3.createHandlerFactory)(opt));
    }
    if (protocols.length === 0) {
        throw new connect_error_js_1.ConnectError("cannot create handler, all protocols are disabled", code_js_1.Code.InvalidArgument);
    }
    return {
        options: opt,
        protocols,
    };
}


/***/ }),
/* 67 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createHandlerContext = createHandlerContext;
exports.createMethodImplSpec = createMethodImplSpec;
exports.createServiceImplSpec = createServiceImplSpec;
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
const signals_js_1 = __webpack_require__(68);
const context_values_js_1 = __webpack_require__(69);
/**
 * Create a new HandlerContext.
 *
 * The context is usually automatically created by handlers, but if a service
 * implementation is used in unit tests, this function can be used to create
 * a context.
 */
function createHandlerContext(init) {
    var _a;
    let timeoutMs;
    if (init.timeoutMs !== undefined) {
        const date = new Date(Date.now() + init.timeoutMs);
        timeoutMs = () => date.getTime() - Date.now();
    }
    else {
        timeoutMs = () => undefined;
    }
    const deadline = (0, signals_js_1.createDeadlineSignal)(init.timeoutMs);
    const abortController = (0, signals_js_1.createLinkedAbortController)(deadline.signal, init.requestSignal, init.shutdownSignal);
    return Object.assign(Object.assign({}, init), { signal: abortController.signal, timeoutMs, requestHeader: new Headers(init.requestHeader), responseHeader: new Headers(init.responseHeader), responseTrailer: new Headers(init.responseTrailer), abort(reason) {
            deadline.cleanup();
            abortController.abort(reason);
        }, values: (_a = init.contextValues) !== null && _a !== void 0 ? _a : (0, context_values_js_1.createContextValues)() });
}
/**
 * Create an MethodImplSpec - a user-provided implementation for a method,
 * wrapped in a discriminated union type along with service and method metadata.
 */
function createMethodImplSpec(service, method, impl) {
    return {
        kind: method.kind,
        service,
        method,
        impl,
    };
}
/**
 * Create an ServiceImplSpec - a user-provided service implementation wrapped
 * with metadata.
 */
function createServiceImplSpec(service, impl) {
    const s = { service, methods: {} };
    for (const [localName, methodInfo] of Object.entries(service.methods)) {
        let fn = impl[localName];
        if (typeof fn == "function") {
            fn = fn.bind(impl);
        }
        else {
            const message = `${service.typeName}.${methodInfo.name} is not implemented`;
            fn = function unimplemented() {
                throw new connect_error_js_1.ConnectError(message, code_js_1.Code.Unimplemented);
            };
        }
        s.methods[localName] = createMethodImplSpec(service, methodInfo, fn);
    }
    return s;
}


/***/ }),
/* 68 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createLinkedAbortController = createLinkedAbortController;
exports.createDeadlineSignal = createDeadlineSignal;
exports.getAbortSignalReason = getAbortSignalReason;
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
/**
 * Create an AbortController that is automatically aborted if one of the given
 * signals is aborted.
 *
 * For convenience, the linked AbortSignals can be undefined.
 *
 * If the controller or any of the signals is aborted, all event listeners are
 * removed.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createLinkedAbortController(...signals) {
    const controller = new AbortController();
    const sa = signals.filter((s) => s !== undefined).concat(controller.signal);
    for (const signal of sa) {
        if (signal.aborted) {
            onAbort.apply(signal);
            break;
        }
        signal.addEventListener("abort", onAbort);
    }
    function onAbort() {
        if (!controller.signal.aborted) {
            controller.abort(getAbortSignalReason(this));
        }
        for (const signal of sa) {
            signal.removeEventListener("abort", onAbort);
        }
    }
    return controller;
}
/**
 * Create a deadline signal. The returned object contains an AbortSignal, but
 * also a cleanup function to stop the timer, which must be called once the
 * calling code is no longer interested in the signal.
 *
 * Ideally, we would simply use AbortSignal.timeout(), but it is not widely
 * available yet.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createDeadlineSignal(timeoutMs) {
    const controller = new AbortController();
    const listener = () => {
        controller.abort(new connect_error_js_1.ConnectError("the operation timed out", code_js_1.Code.DeadlineExceeded));
    };
    let timeoutId;
    if (timeoutMs !== undefined) {
        if (timeoutMs <= 0)
            listener();
        else
            timeoutId = setTimeout(listener, timeoutMs);
    }
    return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timeoutId),
    };
}
/**
 * Returns the reason why an AbortSignal was aborted. Returns undefined if the
 * signal has not been aborted.
 *
 * The property AbortSignal.reason is not widely available. This function
 * returns an AbortError if the signal is aborted, but reason is undefined.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function getAbortSignalReason(signal) {
    if (!signal.aborted) {
        return undefined;
    }
    if (signal.reason !== undefined) {
        return signal.reason;
    }
    // AbortSignal.reason is available in Node.js v16, v18, and later,
    // and in all browsers since early 2022.
    const e = new Error("This operation was aborted");
    e.name = "AbortError";
    return e;
}


/***/ }),
/* 69 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createContextValues = createContextValues;
exports.createContextKey = createContextKey;
/**
 * createContextValues creates a new ContextValues.
 */
function createContextValues() {
    return {
        get(key) {
            return key.id in this ? this[key.id] : key.defaultValue;
        },
        set(key, value) {
            this[key.id] = value;
            return this;
        },
        delete(key) {
            delete this[key.id];
            return this;
        },
    };
}
/**
 * createContextKey creates a new ContextKey.
 */
function createContextKey(defaultValue, options) {
    return { id: Symbol(options === null || options === void 0 ? void 0 : options.description), defaultValue };
}


/***/ }),
/* 70 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createHandlerFactory = createHandlerFactory;
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
const implementation_js_1 = __webpack_require__(67);
const trailer_js_1 = __webpack_require__(71);
const headers_js_1 = __webpack_require__(72);
const content_type_js_1 = __webpack_require__(74);
const parse_timeout_js_1 = __webpack_require__(75);
const trailer_status_js_1 = __webpack_require__(76);
const async_iterable_js_1 = __webpack_require__(61);
const compression_js_1 = __webpack_require__(63);
const content_type_matcher_js_1 = __webpack_require__(78);
const create_method_url_js_1 = __webpack_require__(79);
const invoke_implementation_js_1 = __webpack_require__(80);
const serialization_js_1 = __webpack_require__(83);
const universal_handler_js_1 = __webpack_require__(84);
const universal_js_1 = __webpack_require__(85);
const protocolName = "grpc-web";
const methodPost = "POST";
/**
 * Create a factory that creates gRPC-web handlers.
 */
function createHandlerFactory(options) {
    const opt = (0, universal_handler_js_1.validateUniversalHandlerOptions)(options);
    const trailerSerialization = (0, trailer_js_1.createTrailerSerialization)();
    function fact(spec) {
        const h = createHandler(opt, trailerSerialization, spec);
        return Object.assign(h, {
            protocolNames: [protocolName],
            allowedMethods: [methodPost],
            supportedContentType: (0, content_type_matcher_js_1.contentTypeMatcher)(content_type_js_1.contentTypeRegExp),
            requestPath: (0, create_method_url_js_1.createMethodUrl)("/", spec.service, spec.method),
            service: spec.service,
            method: spec.method,
        });
    }
    fact.protocolName = protocolName;
    return fact;
}
function createHandler(opt, trailerSerialization, spec) {
    const serialization = (0, serialization_js_1.createMethodSerializationLookup)(spec.method, opt.binaryOptions, opt.jsonOptions, opt);
    return async function handle(req) {
        (0, universal_js_1.assertByteStreamRequest)(req);
        const type = (0, content_type_js_1.parseContentType)(req.header.get(headers_js_1.headerContentType));
        if (type == undefined || type.text) {
            return universal_js_1.uResponseUnsupportedMediaType;
        }
        if (req.method !== methodPost) {
            return universal_js_1.uResponseMethodNotAllowed;
        }
        const timeout = (0, parse_timeout_js_1.parseTimeout)(req.header.get(headers_js_1.headerTimeout), opt.maxTimeoutMs);
        const context = (0, implementation_js_1.createHandlerContext)(Object.assign(Object.assign({}, spec), { requestMethod: req.method, protocolName, timeoutMs: timeout.timeoutMs, shutdownSignal: opt.shutdownSignal, requestSignal: req.signal, requestHeader: req.header, url: req.url, responseHeader: {
                [headers_js_1.headerContentType]: type.binary ? content_type_js_1.contentTypeProto : content_type_js_1.contentTypeJson,
            }, responseTrailer: {
                [headers_js_1.headerGrpcStatus]: trailer_status_js_1.grpcStatusOk,
            }, contextValues: req.contextValues }));
        const compression = (0, compression_js_1.compressionNegotiate)(opt.acceptCompression, req.header.get(headers_js_1.headerEncoding), req.header.get(headers_js_1.headerAcceptEncoding), headers_js_1.headerAcceptEncoding);
        if (compression.response) {
            context.responseHeader.set(headers_js_1.headerEncoding, compression.response.name);
        }
        // We split the pipeline into two parts: The request iterator, and the
        // response iterator. We do this because the request iterator is responsible
        // for parsing the request body, and we don't want write errors of the response
        // iterator to affect the request iterator.
        const inputIt = (0, async_iterable_js_1.pipe)(req.body, (0, async_iterable_js_1.transformPrepend)(() => {
            // raise compression error to serialize it as a trailer status
            if (compression.error)
                throw compression.error;
            // raise timeout parsing error to serialize it as a trailer status
            if (timeout.error)
                throw timeout.error;
            return undefined;
        }), (0, async_iterable_js_1.transformSplitEnvelope)(opt.readMaxBytes), (0, async_iterable_js_1.transformDecompressEnvelope)(compression.request, opt.readMaxBytes), (0, async_iterable_js_1.transformParseEnvelope)(serialization.getI(type.binary), trailer_js_1.trailerFlag));
        const it = (0, invoke_implementation_js_1.transformInvokeImplementation)(spec, context, opt.interceptors)(inputIt)[Symbol.asyncIterator]();
        const outputIt = (0, async_iterable_js_1.pipe)(
        // We wrap the iterator in an async iterator to ensure that the
        // abort signal is aborted when the iterator is done.
        {
            [Symbol.asyncIterator]() {
                return {
                    next: () => it.next(),
                    throw: (e) => {
                        var _a, _b;
                        context.abort(e);
                        return (_b = (_a = it.throw) === null || _a === void 0 ? void 0 : _a.call(it, e)) !== null && _b !== void 0 ? _b : Promise.reject({ done: true });
                    },
                    return: (v) => {
                        var _a, _b;
                        context.abort();
                        return ((_b = (_a = it.return) === null || _a === void 0 ? void 0 : _a.call(it, v)) !== null && _b !== void 0 ? _b : Promise.resolve({ done: true, value: v }));
                    },
                };
            },
        }, (0, async_iterable_js_1.transformSerializeEnvelope)(serialization.getO(type.binary)), (0, async_iterable_js_1.transformCatchFinally)((e) => {
            context.abort();
            if (e instanceof connect_error_js_1.ConnectError) {
                (0, trailer_status_js_1.setTrailerStatus)(context.responseTrailer, e);
            }
            else if (e !== undefined) {
                (0, trailer_status_js_1.setTrailerStatus)(context.responseTrailer, new connect_error_js_1.ConnectError("internal error", code_js_1.Code.Internal, undefined, undefined, e));
            }
            return {
                flags: trailer_js_1.trailerFlag,
                data: trailerSerialization.serialize(context.responseTrailer),
            };
        }), (0, async_iterable_js_1.transformCompressEnvelope)(compression.response, opt.compressMinBytes), (0, async_iterable_js_1.transformJoinEnvelopes)(), { propagateDownStreamError: true });
        return Object.assign(Object.assign({}, universal_js_1.uResponseOk), {
            // We wait for the first response body bytes before resolving, so that
            // implementations have a chance to add headers before an adapter commits
            // them to the wire.
            body: await (0, async_iterable_js_1.untilFirst)(outputIt), header: context.responseHeader });
    };
}


/***/ }),
/* 71 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.trailerFlag = void 0;
exports.trailerParse = trailerParse;
exports.trailerSerialize = trailerSerialize;
exports.createTrailerSerialization = createTrailerSerialization;
/**
 * trailerFlag indicates that the data in a EnvelopedMessage
 * is a set of trailers of the gRPC-web protocol.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.trailerFlag = 0b10000000;
/**
 * Parse a gRPC-web trailer, a set of header fields separated by CRLF.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function trailerParse(data) {
    const headers = new Headers();
    const lines = new TextDecoder().decode(data).split("\r\n");
    for (const line of lines) {
        if (line === "") {
            continue;
        }
        const i = line.indexOf(":");
        if (i > 0) {
            const name = line.substring(0, i).trim();
            const value = line.substring(i + 1).trim();
            headers.append(name, value);
        }
    }
    return headers;
}
/**
 * Serialize a Headers object as a gRPC-web trailer.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function trailerSerialize(trailer) {
    const lines = [];
    trailer.forEach((value, key) => {
        lines.push(`${key}: ${value}\r\n`);
    });
    return new TextEncoder().encode(lines.join(""));
}
/**
 * Create a Serialization object that serializes a gRPC-web trailer, a Headers
 * object that is serialized as a set of header fields, separated by CRLF.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createTrailerSerialization() {
    return {
        serialize: trailerSerialize,
        parse: trailerParse,
    };
}


/***/ }),
/* 72 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.headerXGrpcWeb = exports.headerXUserAgent = exports.headerUserAgent = exports.headerStatusDetailsBin = exports.headerGrpcMessage = exports.headerGrpcStatus = exports.headerTimeout = exports.headerAcceptEncoding = exports.headerEncoding = exports.headerContentType = void 0;
/**
 * @private Internal code, does not follow semantic versioning.
 */
var headers_js_1 = __webpack_require__(73);
Object.defineProperty(exports, "headerContentType", ({ enumerable: true, get: function () { return headers_js_1.headerContentType; } }));
Object.defineProperty(exports, "headerEncoding", ({ enumerable: true, get: function () { return headers_js_1.headerEncoding; } }));
Object.defineProperty(exports, "headerAcceptEncoding", ({ enumerable: true, get: function () { return headers_js_1.headerAcceptEncoding; } }));
Object.defineProperty(exports, "headerTimeout", ({ enumerable: true, get: function () { return headers_js_1.headerTimeout; } }));
Object.defineProperty(exports, "headerGrpcStatus", ({ enumerable: true, get: function () { return headers_js_1.headerGrpcStatus; } }));
Object.defineProperty(exports, "headerGrpcMessage", ({ enumerable: true, get: function () { return headers_js_1.headerGrpcMessage; } }));
Object.defineProperty(exports, "headerStatusDetailsBin", ({ enumerable: true, get: function () { return headers_js_1.headerStatusDetailsBin; } }));
Object.defineProperty(exports, "headerUserAgent", ({ enumerable: true, get: function () { return headers_js_1.headerUserAgent; } }));
/**
 * gRPC-web does not use the standard header User-Agent.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.headerXUserAgent = "X-User-Agent";
/**
 * The canonical grpc/grpc-web JavaScript implementation sets
 * this request header with value "1".
 * Some servers may rely on the header to identify gRPC-web
 * requests. For example the proxy by improbable:
 * https://github.com/improbable-eng/grpc-web/blob/53aaf4cdc0fede7103c1b06f0cfc560c003a5c41/go/grpcweb/wrapper.go#L231
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.headerXGrpcWeb = "X-Grpc-Web";


/***/ }),
/* 73 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.headerUserAgent = exports.headerMessageType = exports.headerStatusDetailsBin = exports.headerGrpcMessage = exports.headerGrpcStatus = exports.headerTimeout = exports.headerAcceptEncoding = exports.headerEncoding = exports.headerContentType = void 0;
/**
 * @private Internal code, does not follow semantic versioning.
 */
exports.headerContentType = "Content-Type";
exports.headerEncoding = "Grpc-Encoding";
exports.headerAcceptEncoding = "Grpc-Accept-Encoding";
exports.headerTimeout = "Grpc-Timeout";
exports.headerGrpcStatus = "Grpc-Status";
exports.headerGrpcMessage = "Grpc-Message";
exports.headerStatusDetailsBin = "Grpc-Status-Details-Bin";
exports.headerMessageType = "Grpc-Message-Type";
exports.headerUserAgent = "User-Agent";


/***/ }),
/* 74 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.contentTypeJson = exports.contentTypeProto = exports.contentTypeRegExp = void 0;
exports.parseContentType = parseContentType;
/**
 * Regular Expression that matches any valid gRPC-web Content-Type header value.
 * Note that this includes application/grpc-web-text with the additional base64
 * encoding.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.contentTypeRegExp = /^application\/grpc-web(-text)?(?:\+(?:(json)(?:; ?charset=utf-?8)?|proto))?$/i;
exports.contentTypeProto = "application/grpc-web+proto";
exports.contentTypeJson = "application/grpc-web+json";
/**
 * Parse a gRPC-web Content-Type header value.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function parseContentType(contentType) {
    const match = contentType === null || contentType === void 0 ? void 0 : contentType.match(exports.contentTypeRegExp);
    if (!match) {
        return undefined;
    }
    const text = !!match[1];
    const binary = !match[2];
    return { text, binary };
}


/***/ }),
/* 75 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseTimeout = parseTimeout;
const code_js_1 = __webpack_require__(7);
const connect_error_js_1 = __webpack_require__(6);
/**
 * Parse a gRPC Timeout (Deadline) header.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function parseTimeout(value, maxTimeoutMs) {
    if (value === null) {
        return {};
    }
    const results = /^(\d{1,8})([HMSmun])$/.exec(value);
    if (results === null) {
        return {
            error: new connect_error_js_1.ConnectError(`protocol error: invalid grpc timeout value: ${value}`, code_js_1.Code.InvalidArgument),
        };
    }
    const unitToMultiplicand = {
        H: 60 * 60 * 1000, // hour
        M: 60 * 1000, // minute
        S: 1000, // second
        m: 1, // millisecond
        u: 0.001, // microsecond
        n: 0.000001, // nanosecond
    };
    const timeoutMs = unitToMultiplicand[results[2]] *
        parseInt(results[1]);
    if (timeoutMs > maxTimeoutMs) {
        return {
            timeoutMs: timeoutMs,
            error: new connect_error_js_1.ConnectError(`timeout ${timeoutMs}ms must be <= ${maxTimeoutMs}`, code_js_1.Code.InvalidArgument),
        };
    }
    return {
        timeoutMs,
    };
}


/***/ }),
/* 76 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.grpcStatusOk = void 0;
exports.setTrailerStatus = setTrailerStatus;
exports.findTrailerError = findTrailerError;
const protobuf_1 = __webpack_require__(10);
const status_pb_js_1 = __webpack_require__(77);
const connect_error_js_1 = __webpack_require__(6);
const http_headers_js_1 = __webpack_require__(9);
const code_js_1 = __webpack_require__(7);
const headers_js_1 = __webpack_require__(73);
/**
 * The value of the Grpc-Status header or trailer in case of success.
 * Used by the gRPC and gRPC-web protocols.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.grpcStatusOk = "0";
/**
 * Sets the fields "grpc-status" and "grpc-message" in the given
 * Headers object.
 * If an error is given and contains error details, the function
 * will also set the field "grpc-status-details-bin" with an encoded
 * google.rpc.Status message including the error details.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function setTrailerStatus(target, error) {
    if (error) {
        target.set(headers_js_1.headerGrpcStatus, error.code.toString(10));
        target.set(headers_js_1.headerGrpcMessage, encodeURIComponent(error.rawMessage));
        if (error.details.length > 0) {
            const status = new status_pb_js_1.Status({
                code: error.code,
                message: error.rawMessage,
                details: error.details.map((value) => "getType" in value
                    ? protobuf_1.Any.pack(value)
                    : new protobuf_1.Any({
                        typeUrl: `type.googleapis.com/${value.type}`,
                        value: value.value,
                    })),
            });
            target.set(headers_js_1.headerStatusDetailsBin, (0, http_headers_js_1.encodeBinaryHeader)(status));
        }
    }
    else {
        target.set(headers_js_1.headerGrpcStatus, exports.grpcStatusOk.toString());
    }
    return target;
}
/**
 * Find an error status in the given Headers object, which can be either
 * a trailer, or a header (as allowed for so-called trailers-only responses).
 * The field "grpc-status-details-bin" is inspected, and if not present,
 * the fields "grpc-status" and "grpc-message" are used.
 * Returns an error only if the gRPC status code is > 0.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function findTrailerError(headerOrTrailer) {
    // TODO
    // let code: Code;
    // let message: string = "";
    var _a;
    // Prefer the protobuf-encoded data to the grpc-status header.
    const statusBytes = headerOrTrailer.get(headers_js_1.headerStatusDetailsBin);
    if (statusBytes != null) {
        const status = (0, http_headers_js_1.decodeBinaryHeader)(statusBytes, status_pb_js_1.Status);
        if (status.code == 0) {
            return undefined;
        }
        const error = new connect_error_js_1.ConnectError(status.message, status.code, headerOrTrailer);
        error.details = status.details.map((any) => ({
            type: any.typeUrl.substring(any.typeUrl.lastIndexOf("/") + 1),
            value: any.value,
        }));
        return error;
    }
    const grpcStatus = headerOrTrailer.get(headers_js_1.headerGrpcStatus);
    if (grpcStatus != null) {
        if (grpcStatus === exports.grpcStatusOk) {
            return undefined;
        }
        const code = parseInt(grpcStatus, 10);
        if (code in code_js_1.Code) {
            return new connect_error_js_1.ConnectError(decodeURIComponent((_a = headerOrTrailer.get(headers_js_1.headerGrpcMessage)) !== null && _a !== void 0 ? _a : ""), code, headerOrTrailer);
        }
        return new connect_error_js_1.ConnectError(`invalid grpc-status: ${grpcStatus}`, code_js_1.Code.Internal, headerOrTrailer);
    }
    return undefined;
}


/***/ }),
/* 77 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Status = void 0;
const protobuf_1 = __webpack_require__(10);
/**
 * The `Status` type defines a logical error model that is suitable for different
 * programming environments, including REST APIs and RPC APIs. It is used by
 * [gRPC](https://github.com/grpc). The error model is designed to be:
 *
 * - Simple to use and understand for most users
 * - Flexible enough to meet unexpected needs
 *
 * # Overview
 *
 * The `Status` message contains three pieces of data: error code, error message,
 * and error details. The error code should be an enum value of
 * [google.rpc.Code][google.rpc.Code], but it may accept additional error codes if needed.  The
 * error message should be a developer-facing English message that helps
 * developers *understand* and *resolve* the error. If a localized user-facing
 * error message is needed, put the localized message in the error details or
 * localize it in the client. The optional error details may contain arbitrary
 * information about the error. There is a predefined set of error detail types
 * in the package `google.rpc` which can be used for common error conditions.
 *
 * # Language mapping
 *
 * The `Status` message is the logical representation of the error model, but it
 * is not necessarily the actual wire format. When the `Status` message is
 * exposed in different client libraries and different wire protocols, it can be
 * mapped differently. For example, it will likely be mapped to some exceptions
 * in Java, but more likely mapped to some error codes in C.
 *
 * # Other uses
 *
 * The error model and the `Status` message can be used in a variety of
 * environments, either with or without APIs, to provide a
 * consistent developer experience across different environments.
 *
 * Example uses of this error model include:
 *
 * - Partial errors. If a service needs to return partial errors to the client,
 *     it may embed the `Status` in the normal response to indicate the partial
 *     errors.
 *
 * - Workflow errors. A typical workflow has multiple steps. Each step may
 *     have a `Status` message for error reporting purpose.
 *
 * - Batch operations. If a client uses batch request and batch response, the
 *     `Status` message should be used directly inside batch response, one for
 *     each error sub-response.
 *
 * - Asynchronous operations. If an API call embeds asynchronous operation
 *     results in its response, the status of those operations should be
 *     represented directly using the `Status` message.
 *
 * - Logging. If some API errors are stored in logs, the message `Status` could
 *     be used directly after any stripping needed for security/privacy reasons.
 *
 * @generated from message google.rpc.Status
 */
class Status extends protobuf_1.Message {
    constructor(data) {
        super();
        /**
         * The status code, which should be an enum value of [google.rpc.Code][google.rpc.Code].
         *
         * @generated from field: int32 code = 1;
         */
        this.code = 0;
        /**
         * A developer-facing error message, which should be in English. Any
         * user-facing error message should be localized and sent in the
         * [google.rpc.Status.details][google.rpc.Status.details] field, or localized by the client.
         *
         * @generated from field: string message = 2;
         */
        this.message = "";
        /**
         * A list of messages that carry the error details.  There will be a
         * common set of message types for APIs to use.
         *
         * @generated from field: repeated google.protobuf.Any details = 3;
         */
        this.details = [];
        protobuf_1.proto3.util.initPartial(data, this);
    }
    static fromBinary(bytes, options) {
        return new Status().fromBinary(bytes, options);
    }
    static fromJson(jsonValue, options) {
        return new Status().fromJson(jsonValue, options);
    }
    static fromJsonString(jsonString, options) {
        return new Status().fromJsonString(jsonString, options);
    }
    static equals(a, b) {
        return protobuf_1.proto3.util.equals(Status, a, b);
    }
}
exports.Status = Status;
Status.runtime = protobuf_1.proto3;
Status.typeName = "google.rpc.Status";
Status.fields = protobuf_1.proto3.util.newFieldList(() => [
    { no: 1, name: "code", kind: "scalar", T: 5 /* ScalarType.INT32 */ },
    { no: 2, name: "message", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "details", kind: "message", T: protobuf_1.Any, repeated: true },
]);


/***/ }),
/* 78 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.contentTypeMatcher = contentTypeMatcher;
const contentTypeMatcherCacheSize = 1024;
/**
 * Create a function that returns true if the given mime type is supported.
 * A mime type is supported when one of the regular expressions match.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function contentTypeMatcher(...supported) {
    const cache = new Map();
    const source = supported.reduce((previousValue, currentValue) => previousValue.concat("supported" in currentValue ? currentValue.supported : currentValue), []);
    function match(contentType) {
        if (contentType === null || contentType.length == 0) {
            return false;
        }
        const cached = cache.get(contentType);
        if (cached !== undefined) {
            return cached;
        }
        const ok = source.some((re) => re.test(contentType));
        if (cache.size < contentTypeMatcherCacheSize) {
            cache.set(contentType, ok);
        }
        return ok;
    }
    match.supported = source;
    return match;
}


/***/ }),
/* 79 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createMethodUrl = createMethodUrl;
/**
 * Create a URL for the given RPC. This simply adds the qualified
 * service name, a slash, and the method name to the path of the given
 * baseUrl.
 *
 * For example, the baseUri https://example.com and method "Say" from
 * the service example.ElizaService results in:
 * https://example.com/example.ElizaService/Say
 *
 * This format is used by the protocols Connect, gRPC and Twirp.
 *
 * Note that this function also accepts a protocol-relative baseUrl.
 * If given an empty string or "/" as a baseUrl, it returns just the
 * path.
 */
function createMethodUrl(baseUrl, service, method) {
    const s = typeof service == "string" ? service : service.typeName;
    const m = typeof method == "string" ? method : method.name;
    return baseUrl.toString().replace(/\/?$/, `/${s}/${m}`);
}


/***/ }),
/* 80 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.invokeUnaryImplementation = invokeUnaryImplementation;
exports.transformInvokeImplementation = transformInvokeImplementation;
const protobuf_1 = __webpack_require__(10);
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
const normalize_js_1 = __webpack_require__(81);
const interceptor_js_1 = __webpack_require__(82);
/**
 * Invoke a user-provided implementation of a unary RPC. Returns a normalized
 * output message.
 *
 * @private Internal code, does not follow semantic versioning.
 */
async function invokeUnaryImplementation(spec, context, input, interceptors) {
    const anyFn = async (req) => {
        return {
            message: (0, normalize_js_1.normalize)(spec.method.O, await spec.impl(req.message, Object.assign(Object.assign({}, context), { service: req.service, method: req.method, requestHeader: req.header, values: req.contextValues, signal: req.signal }))),
            stream: false,
            service: req.service,
            method: req.method,
            header: context.responseHeader,
            trailer: context.responseTrailer,
        };
    };
    const next = (0, interceptor_js_1.applyInterceptors)(anyFn, interceptors);
    const { message } = await next({
        init: {
            method: context.requestMethod,
        },
        message: input,
        url: context.url,
        signal: context.signal,
        service: spec.service,
        method: spec.method,
        header: context.requestHeader,
        contextValues: context.values,
        stream: false,
    });
    return message;
}
/**
 * Return an AsyncIterableTransform that invokes a user-provided implementation,
 * giving it input from an asynchronous iterable, and returning its output as an
 * asynchronous iterable.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformInvokeImplementation(spec, context, interceptors) {
    switch (spec.kind) {
        case protobuf_1.MethodKind.Unary:
            return function unary(input) {
                return __asyncGenerator(this, arguments, function* unary_1() {
                    const inputIt = input[Symbol.asyncIterator]();
                    const input1 = yield __await(inputIt.next());
                    if (input1.done === true) {
                        throw new connect_error_js_1.ConnectError("protocol error: missing input message for unary method", code_js_1.Code.Unimplemented);
                    }
                    const anyFn = async (req) => {
                        return {
                            message: (0, normalize_js_1.normalize)(spec.method.O, await spec.impl(req.message, Object.assign(Object.assign({}, context), { service: req.service, method: req.method, requestHeader: req.header, values: req.contextValues, signal: req.signal }))),
                            stream: false,
                            service: req.service,
                            method: req.method,
                            header: context.responseHeader,
                            trailer: context.responseTrailer,
                        };
                    };
                    const next = (0, interceptor_js_1.applyInterceptors)(anyFn, interceptors);
                    const { message, header, trailer } = yield __await(next({
                        init: {
                            method: context.requestMethod,
                        },
                        message: input1.value,
                        url: context.url,
                        signal: context.signal,
                        service: spec.service,
                        method: spec.method,
                        header: context.requestHeader,
                        contextValues: context.values,
                        stream: false,
                    }));
                    copyHeaders(header, context.responseHeader);
                    copyHeaders(trailer, context.responseTrailer);
                    yield yield __await(message);
                    const input2 = yield __await(inputIt.next());
                    if (input2.done !== true) {
                        throw new connect_error_js_1.ConnectError("protocol error: received extra input message for unary method", code_js_1.Code.Unimplemented);
                    }
                });
            };
        case protobuf_1.MethodKind.ServerStreaming: {
            return function serverStreaming(input) {
                return __asyncGenerator(this, arguments, function* serverStreaming_1() {
                    const inputIt = input[Symbol.asyncIterator]();
                    const input1 = yield __await(inputIt.next());
                    if (input1.done === true) {
                        throw new connect_error_js_1.ConnectError("protocol error: missing input message for server-streaming method", code_js_1.Code.Unimplemented);
                    }
                    const anyFn = async (req) => {
                        return {
                            message: (0, normalize_js_1.normalizeIterable)(spec.method.O, spec.impl(req.message, Object.assign(Object.assign({}, context), { service: req.service, method: req.method, requestHeader: req.header, values: req.contextValues, signal: req.signal }))),
                            stream: true,
                            service: req.service,
                            method: req.method,
                            header: context.responseHeader,
                            trailer: context.responseTrailer,
                        };
                    };
                    const next = (0, interceptor_js_1.applyInterceptors)(anyFn, interceptors);
                    const { message, header, trailer } = yield __await(next({
                        init: {
                            method: context.requestMethod,
                        },
                        message: input1.value,
                        url: context.url,
                        signal: context.signal,
                        service: spec.service,
                        method: spec.method,
                        header: context.requestHeader,
                        contextValues: context.values,
                        stream: false,
                    }));
                    copyHeaders(header, context.responseHeader);
                    copyHeaders(trailer, context.responseTrailer);
                    yield __await(yield* __asyncDelegator(__asyncValues(message)));
                    const input2 = yield __await(inputIt.next());
                    if (input2.done !== true) {
                        throw new connect_error_js_1.ConnectError("protocol error: received extra input message for server-streaming method", code_js_1.Code.Unimplemented);
                    }
                });
            };
        }
        case protobuf_1.MethodKind.ClientStreaming: {
            return function clientStreaming(input) {
                return __asyncGenerator(this, arguments, function* clientStreaming_1() {
                    const anyFn = async (req) => {
                        return {
                            message: (0, normalize_js_1.normalize)(spec.method.O, await spec.impl(req.message, Object.assign(Object.assign({}, context), { service: req.service, method: req.method, requestHeader: req.header, values: req.contextValues, signal: req.signal }))),
                            stream: false,
                            service: req.service,
                            method: req.method,
                            header: context.responseHeader,
                            trailer: context.responseTrailer,
                        };
                    };
                    const next = (0, interceptor_js_1.applyInterceptors)(anyFn, interceptors);
                    const { message, header, trailer } = yield __await(next({
                        init: {
                            method: context.requestMethod,
                        },
                        message: input,
                        url: context.url,
                        signal: context.signal,
                        service: spec.service,
                        method: spec.method,
                        header: context.requestHeader,
                        contextValues: context.values,
                        stream: true,
                    }));
                    copyHeaders(header, context.responseHeader);
                    copyHeaders(trailer, context.responseTrailer);
                    yield yield __await(message);
                });
            };
        }
        case protobuf_1.MethodKind.BiDiStreaming:
            return function biDiStreaming(input) {
                return __asyncGenerator(this, arguments, function* biDiStreaming_1() {
                    const anyFn = async (req) => {
                        return {
                            message: (0, normalize_js_1.normalizeIterable)(spec.method.O, spec.impl(req.message, Object.assign(Object.assign({}, context), { service: req.service, method: req.method, requestHeader: req.header, values: req.contextValues, signal: req.signal }))),
                            stream: true,
                            service: req.service,
                            method: req.method,
                            header: context.responseHeader,
                            trailer: context.responseTrailer,
                        };
                    };
                    const next = (0, interceptor_js_1.applyInterceptors)(anyFn, interceptors);
                    const { message, header, trailer } = yield __await(next({
                        init: {
                            method: context.requestMethod,
                        },
                        message: input,
                        url: context.url,
                        signal: context.signal,
                        service: spec.service,
                        method: spec.method,
                        header: context.requestHeader,
                        contextValues: context.values,
                        stream: true,
                    }));
                    copyHeaders(header, context.responseHeader);
                    copyHeaders(trailer, context.responseTrailer);
                    yield __await(yield* __asyncDelegator(__asyncValues(message)));
                });
            };
    }
}
function copyHeaders(from, to) {
    if (from === to) {
        return;
    }
    to.forEach((_, key) => {
        to.delete(key);
    });
    from.forEach((value, key) => {
        to.set(key, value);
    });
}


/***/ }),
/* 81 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.normalize = normalize;
exports.normalizeIterable = normalizeIterable;
/**
 *  Takes a partial protobuf messages of the
 *  specified message type as input, and returns full instances.
 */
function normalize(type, message) {
    return message instanceof type
        ? message
        : new type(message);
}
/**
 * Takes an AsyncIterable of partial protobuf messages of the
 * specified message type as input, and yields full instances.
 */
function normalizeIterable(messageType, input) {
    function transform(result) {
        if (result.done === true) {
            return result;
        }
        return {
            done: result.done,
            value: normalize(messageType, result.value),
        };
    }
    return {
        [Symbol.asyncIterator]() {
            const it = input[Symbol.asyncIterator]();
            const res = {
                next: () => it.next().then(transform),
            };
            if (it.throw !== undefined) {
                res.throw = (e) => it.throw(e).then(transform); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            }
            if (it.return !== undefined) {
                res.return = (v) => it.return(v).then(transform); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            }
            return res;
        },
    };
}


/***/ }),
/* 82 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.applyInterceptors = applyInterceptors;
/**
 * applyInterceptors takes the given UnaryFn or ServerStreamingFn, and wraps
 * it with each of the given interceptors, returning a new UnaryFn or
 * ServerStreamingFn.
 */
function applyInterceptors(next, interceptors) {
    var _a;
    return ((_a = interceptors === null || interceptors === void 0 ? void 0 : interceptors.concat().reverse().reduce(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    (n, i) => i(n), next)) !== null && _a !== void 0 ? _a : next);
}


/***/ }),
/* 83 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getJsonOptions = getJsonOptions;
exports.createMethodSerializationLookup = createMethodSerializationLookup;
exports.createClientMethodSerializers = createClientMethodSerializers;
exports.limitSerialization = limitSerialization;
exports.createBinarySerialization = createBinarySerialization;
exports.createJsonSerialization = createJsonSerialization;
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
const limit_io_js_1 = __webpack_require__(64);
/**
 * Sets default JSON serialization options for connect-es.
 *
 * With standard protobuf JSON serialization, unknown JSON fields are
 * rejected by default. In connect-es, unknown JSON fields are ignored
 * by default.
 */
function getJsonOptions(options) {
    var _a;
    const o = Object.assign({}, options);
    (_a = o.ignoreUnknownFields) !== null && _a !== void 0 ? _a : (o.ignoreUnknownFields = true);
    return o;
}
/**
 * Create an object that provides convenient access to request and response
 * message serialization for a given method.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createMethodSerializationLookup(method, binaryOptions, jsonOptions, limitOptions) {
    const inputBinary = limitSerialization(createBinarySerialization(method.I, binaryOptions), limitOptions);
    const inputJson = limitSerialization(createJsonSerialization(method.I, jsonOptions), limitOptions);
    const outputBinary = limitSerialization(createBinarySerialization(method.O, binaryOptions), limitOptions);
    const outputJson = limitSerialization(createJsonSerialization(method.O, jsonOptions), limitOptions);
    return {
        getI(useBinaryFormat) {
            return useBinaryFormat ? inputBinary : inputJson;
        },
        getO(useBinaryFormat) {
            return useBinaryFormat ? outputBinary : outputJson;
        },
    };
}
/**
 * Returns functions to normalize and serialize the input message
 * of an RPC, and to parse the output message of an RPC.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createClientMethodSerializers(method, useBinaryFormat, jsonOptions, binaryOptions) {
    const input = useBinaryFormat
        ? createBinarySerialization(method.I, binaryOptions)
        : createJsonSerialization(method.I, jsonOptions);
    const output = useBinaryFormat
        ? createBinarySerialization(method.O, binaryOptions)
        : createJsonSerialization(method.O, jsonOptions);
    return { parse: output.parse, serialize: input.serialize };
}
/**
 * Apply I/O limits to a Serialization object, returning a new object.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function limitSerialization(serialization, limitOptions) {
    return {
        serialize(data) {
            const bytes = serialization.serialize(data);
            (0, limit_io_js_1.assertWriteMaxBytes)(limitOptions.writeMaxBytes, bytes.byteLength);
            return bytes;
        },
        parse(data) {
            (0, limit_io_js_1.assertReadMaxBytes)(limitOptions.readMaxBytes, data.byteLength, true);
            return serialization.parse(data);
        },
    };
}
/**
 * Creates a Serialization object for serializing the given protobuf message
 * with the protobuf binary format.
 */
function createBinarySerialization(messageType, options) {
    return {
        parse(data) {
            try {
                return messageType.fromBinary(data, options);
            }
            catch (e) {
                const m = e instanceof Error ? e.message : String(e);
                throw new connect_error_js_1.ConnectError(`parse binary: ${m}`, code_js_1.Code.Internal);
            }
        },
        serialize(data) {
            try {
                return data.toBinary(options);
            }
            catch (e) {
                const m = e instanceof Error ? e.message : String(e);
                throw new connect_error_js_1.ConnectError(`serialize binary: ${m}`, code_js_1.Code.Internal);
            }
        },
    };
}
/**
 * Creates a Serialization object for serializing the given protobuf message
 * with the protobuf canonical JSON encoding.
 *
 * By default, unknown fields are ignored.
 */
function createJsonSerialization(messageType, options) {
    var _a, _b;
    const textEncoder = (_a = options === null || options === void 0 ? void 0 : options.textEncoder) !== null && _a !== void 0 ? _a : new TextEncoder();
    const textDecoder = (_b = options === null || options === void 0 ? void 0 : options.textDecoder) !== null && _b !== void 0 ? _b : new TextDecoder();
    const o = getJsonOptions(options);
    return {
        parse(data) {
            try {
                const json = textDecoder.decode(data);
                return messageType.fromJsonString(json, o);
            }
            catch (e) {
                throw connect_error_js_1.ConnectError.from(e, code_js_1.Code.InvalidArgument);
            }
        },
        serialize(data) {
            try {
                const json = data.toJsonString(o);
                return textEncoder.encode(json);
            }
            catch (e) {
                throw connect_error_js_1.ConnectError.from(e, code_js_1.Code.Internal);
            }
        },
    };
}


/***/ }),
/* 84 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.validateUniversalHandlerOptions = validateUniversalHandlerOptions;
exports.createUniversalServiceHandlers = createUniversalServiceHandlers;
exports.createUniversalMethodHandler = createUniversalMethodHandler;
exports.negotiateProtocol = negotiateProtocol;
const protobuf_1 = __webpack_require__(10);
const universal_js_1 = __webpack_require__(85);
const content_type_matcher_js_1 = __webpack_require__(78);
const limit_io_js_1 = __webpack_require__(64);
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
/**
 * Asserts that the options are within sane limits, and returns default values
 * where no value is provided.
 *
 * Note that this function does not set default values for `acceptCompression`.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function validateUniversalHandlerOptions(opt) {
    var _a, _b, _c;
    opt !== null && opt !== void 0 ? opt : (opt = {});
    const acceptCompression = opt.acceptCompression
        ? [...opt.acceptCompression]
        : [];
    const requireConnectProtocolHeader = (_a = opt.requireConnectProtocolHeader) !== null && _a !== void 0 ? _a : false;
    const maxTimeoutMs = (_b = opt.maxTimeoutMs) !== null && _b !== void 0 ? _b : Number.MAX_SAFE_INTEGER;
    return Object.assign(Object.assign({ acceptCompression }, (0, limit_io_js_1.validateReadWriteMaxBytes)(opt.readMaxBytes, opt.writeMaxBytes, opt.compressMinBytes)), { jsonOptions: opt.jsonOptions, binaryOptions: opt.binaryOptions, maxTimeoutMs, shutdownSignal: opt.shutdownSignal, requireConnectProtocolHeader, interceptors: (_c = opt.interceptors) !== null && _c !== void 0 ? _c : [] });
}
/**
 * For the given service implementation, return a universal handler for each
 * RPC. The handler serves the given protocols.
 *
 * At least one protocol is required.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createUniversalServiceHandlers(spec, protocols) {
    return Object.entries(spec.methods).map(([, implSpec]) => createUniversalMethodHandler(implSpec, protocols));
}
/**
 * Return a universal handler for the given RPC implementation.
 * The handler serves the given protocols.
 *
 * At least one protocol is required.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createUniversalMethodHandler(spec, protocols) {
    return negotiateProtocol(protocols.map((f) => f(spec)));
}
/**
 * Create a universal handler that negotiates the protocol.
 *
 * This functions takes one or more handlers - all for the same RPC, but for
 * different protocols - and returns a single handler that looks at the
 * Content-Type header and the HTTP verb of the incoming request to select
 * the appropriate protocol-specific handler.
 *
 * Raises an error if no protocol handlers were provided, or if they do not
 * handle exactly the same RPC.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function negotiateProtocol(protocolHandlers) {
    if (protocolHandlers.length == 0) {
        throw new connect_error_js_1.ConnectError("at least one protocol is required", code_js_1.Code.Internal);
    }
    const service = protocolHandlers[0].service;
    const method = protocolHandlers[0].method;
    const requestPath = protocolHandlers[0].requestPath;
    if (protocolHandlers.some((h) => h.service !== service || h.method !== method)) {
        throw new connect_error_js_1.ConnectError("cannot negotiate protocol for different RPCs", code_js_1.Code.Internal);
    }
    if (protocolHandlers.some((h) => h.requestPath !== requestPath)) {
        throw new connect_error_js_1.ConnectError("cannot negotiate protocol for different requestPaths", code_js_1.Code.Internal);
    }
    async function protocolNegotiatingHandler(request) {
        var _a;
        if (method.kind == protobuf_1.MethodKind.BiDiStreaming &&
            request.httpVersion.startsWith("1.")) {
            return Object.assign(Object.assign({}, universal_js_1.uResponseVersionNotSupported), {
                // Clients coded to expect full-duplex connections may hang if they've
                // mistakenly negotiated HTTP/1.1. To unblock them, we must close the
                // underlying TCP connection.
                header: new Headers({ Connection: "close" }) });
        }
        const contentType = (_a = request.header.get("Content-Type")) !== null && _a !== void 0 ? _a : "";
        const matchingMethod = protocolHandlers.filter((h) => h.allowedMethods.includes(request.method));
        if (matchingMethod.length == 0) {
            return universal_js_1.uResponseMethodNotAllowed;
        }
        // If Content-Type is unset but only one handler matches, use it.
        if (matchingMethod.length == 1 && contentType === "") {
            const onlyMatch = matchingMethod[0];
            return onlyMatch(request);
        }
        const matchingContentTypes = matchingMethod.filter((h) => h.supportedContentType(contentType));
        if (matchingContentTypes.length == 0) {
            return universal_js_1.uResponseUnsupportedMediaType;
        }
        const firstMatch = matchingContentTypes[0];
        return firstMatch(request);
    }
    return Object.assign(protocolNegotiatingHandler, {
        service,
        method,
        requestPath,
        supportedContentType: (0, content_type_matcher_js_1.contentTypeMatcher)(...protocolHandlers.map((h) => h.supportedContentType)),
        protocolNames: protocolHandlers
            .flatMap((h) => h.protocolNames)
            .filter((value, index, array) => array.indexOf(value) === index),
        allowedMethods: protocolHandlers
            .flatMap((h) => h.allowedMethods)
            .filter((value, index, array) => array.indexOf(value) === index),
    });
}


/***/ }),
/* 85 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.uResponseVersionNotSupported = exports.uResponseMethodNotAllowed = exports.uResponseUnsupportedMediaType = exports.uResponseNotFound = exports.uResponseOk = void 0;
exports.assertByteStreamRequest = assertByteStreamRequest;
/**
 * Assert that the given UniversalServerRequest has a byte stream body, not
 * a JSON value.
 *
 * We accept a JSON object or a byte stream in server requests.
 * In practice, only Connect unary handlers will receive a parse
 * JSON object. Other call-sites can use this assertion to narrow
 * the union type. A failure in such a call-sites indicates that
 * the contract between a server framework and the connect-node \
 * handler is broken.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function assertByteStreamRequest(req) {
    if (typeof req.body == "object" &&
        req.body !== null &&
        Symbol.asyncIterator in req.body) {
        return;
    }
    throw new Error("byte stream required, but received JSON");
}
/**
 * HTTP 200 OK
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.uResponseOk = {
    status: 200,
};
/**
 * HTTP 404 Not Found
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.uResponseNotFound = {
    status: 404,
};
/**
 * HTTP 415 Unsupported Media Type
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.uResponseUnsupportedMediaType = {
    status: 415,
};
/**
 * HTTP 405 Method Not Allowed
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.uResponseMethodNotAllowed = {
    status: 405,
};
/**
 * HTTP 505 Version Not Supported
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.uResponseVersionNotSupported = {
    status: 505,
};


/***/ }),
/* 86 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createHandlerFactory = createHandlerFactory;
const implementation_js_1 = __webpack_require__(67);
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
const content_type_js_1 = __webpack_require__(87);
const headers_js_1 = __webpack_require__(73);
const trailer_status_js_1 = __webpack_require__(76);
const parse_timeout_js_1 = __webpack_require__(75);
const async_iterable_js_1 = __webpack_require__(61);
const compression_js_1 = __webpack_require__(63);
const content_type_matcher_js_1 = __webpack_require__(78);
const create_method_url_js_1 = __webpack_require__(79);
const invoke_implementation_js_1 = __webpack_require__(80);
const serialization_js_1 = __webpack_require__(83);
const universal_handler_js_1 = __webpack_require__(84);
const universal_js_1 = __webpack_require__(85);
const protocolName = "grpc";
const methodPost = "POST";
/**
 * Create a factory that creates gRPC handlers.
 */
function createHandlerFactory(options) {
    const opt = (0, universal_handler_js_1.validateUniversalHandlerOptions)(options);
    function fact(spec) {
        const h = createHandler(opt, spec);
        return Object.assign(h, {
            protocolNames: [protocolName],
            allowedMethods: [methodPost],
            supportedContentType: (0, content_type_matcher_js_1.contentTypeMatcher)(content_type_js_1.contentTypeRegExp),
            requestPath: (0, create_method_url_js_1.createMethodUrl)("/", spec.service, spec.method),
            service: spec.service,
            method: spec.method,
        });
    }
    fact.protocolName = protocolName;
    return fact;
}
function createHandler(opt, spec) {
    const serialization = (0, serialization_js_1.createMethodSerializationLookup)(spec.method, opt.binaryOptions, opt.jsonOptions, opt);
    return async function handle(req) {
        (0, universal_js_1.assertByteStreamRequest)(req);
        const type = (0, content_type_js_1.parseContentType)(req.header.get(headers_js_1.headerContentType));
        if (type == undefined) {
            return universal_js_1.uResponseUnsupportedMediaType;
        }
        if (req.method !== methodPost) {
            return universal_js_1.uResponseMethodNotAllowed;
        }
        const timeout = (0, parse_timeout_js_1.parseTimeout)(req.header.get(headers_js_1.headerTimeout), opt.maxTimeoutMs);
        const context = (0, implementation_js_1.createHandlerContext)(Object.assign(Object.assign({}, spec), { requestMethod: req.method, protocolName, timeoutMs: timeout.timeoutMs, shutdownSignal: opt.shutdownSignal, requestSignal: req.signal, requestHeader: req.header, url: req.url, responseHeader: {
                [headers_js_1.headerContentType]: type.binary ? content_type_js_1.contentTypeProto : content_type_js_1.contentTypeJson,
            }, responseTrailer: {
                [headers_js_1.headerGrpcStatus]: trailer_status_js_1.grpcStatusOk,
            }, contextValues: req.contextValues }));
        const compression = (0, compression_js_1.compressionNegotiate)(opt.acceptCompression, req.header.get(headers_js_1.headerEncoding), req.header.get(headers_js_1.headerAcceptEncoding), headers_js_1.headerAcceptEncoding);
        if (compression.response) {
            context.responseHeader.set(headers_js_1.headerEncoding, compression.response.name);
        }
        // We split the pipeline into two parts: The request iterator, and the
        // response iterator. We do this because the request iterator is responsible
        // for parsing the request body, and we don't want write errors of the response
        // iterator to affect the request iterator.
        const inputIt = (0, async_iterable_js_1.pipe)(req.body, (0, async_iterable_js_1.transformPrepend)(() => {
            // raise compression error to serialize it as a trailer status
            if (compression.error)
                throw compression.error;
            // raise timeout parsing error to serialize it as a trailer status
            if (timeout.error)
                throw timeout.error;
            return undefined;
        }), (0, async_iterable_js_1.transformSplitEnvelope)(opt.readMaxBytes), (0, async_iterable_js_1.transformDecompressEnvelope)(compression.request, opt.readMaxBytes), (0, async_iterable_js_1.transformParseEnvelope)(serialization.getI(type.binary)));
        const it = (0, invoke_implementation_js_1.transformInvokeImplementation)(spec, context, opt.interceptors)(inputIt)[Symbol.asyncIterator]();
        const outputIt = (0, async_iterable_js_1.pipe)(
        // We wrap the iterator in an async iterator to ensure that the
        // abort signal is aborted when the iterator is done.
        {
            [Symbol.asyncIterator]() {
                return {
                    next: () => it.next(),
                    throw: (e) => {
                        var _a, _b;
                        context.abort(e);
                        return (_b = (_a = it.throw) === null || _a === void 0 ? void 0 : _a.call(it, e)) !== null && _b !== void 0 ? _b : Promise.reject({ done: true });
                    },
                    return: (v) => {
                        var _a, _b;
                        context.abort();
                        return ((_b = (_a = it.return) === null || _a === void 0 ? void 0 : _a.call(it, v)) !== null && _b !== void 0 ? _b : Promise.resolve({ done: true, value: v }));
                    },
                };
            },
        }, (0, async_iterable_js_1.transformSerializeEnvelope)(serialization.getO(type.binary)), (0, async_iterable_js_1.transformCompressEnvelope)(compression.response, opt.compressMinBytes), (0, async_iterable_js_1.transformJoinEnvelopes)(), (0, async_iterable_js_1.transformCatchFinally)((e) => {
            context.abort();
            if (e instanceof connect_error_js_1.ConnectError) {
                (0, trailer_status_js_1.setTrailerStatus)(context.responseTrailer, e);
            }
            else if (e !== undefined) {
                (0, trailer_status_js_1.setTrailerStatus)(context.responseTrailer, new connect_error_js_1.ConnectError("internal error", code_js_1.Code.Internal, undefined, undefined, e));
            }
        }), { propagateDownStreamError: true });
        return Object.assign(Object.assign({}, universal_js_1.uResponseOk), {
            // We wait for the first response body bytes before resolving, so that
            // implementations have a chance to add headers before an adapter commits
            // them to the wire.
            body: await (0, async_iterable_js_1.untilFirst)(outputIt), header: context.responseHeader, trailer: context.responseTrailer });
    };
}


/***/ }),
/* 87 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.contentTypeJson = exports.contentTypeProto = exports.contentTypeRegExp = void 0;
exports.parseContentType = parseContentType;
/**
 * Regular Expression that matches any valid gRPC Content-Type header value.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.contentTypeRegExp = /^application\/grpc(?:\+(?:(json)(?:; ?charset=utf-?8)?|proto))?$/i;
exports.contentTypeProto = "application/grpc+proto";
exports.contentTypeJson = "application/grpc+json";
/**
 * Parse a gRPC Content-Type header.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function parseContentType(contentType) {
    const match = contentType === null || contentType === void 0 ? void 0 : contentType.match(exports.contentTypeRegExp);
    if (!match) {
        return undefined;
    }
    const binary = !match[1];
    return { binary };
}


/***/ }),
/* 88 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createHandlerFactory = createHandlerFactory;
const protobuf_1 = __webpack_require__(10);
const code_js_1 = __webpack_require__(7);
const connect_error_js_1 = __webpack_require__(6);
const implementation_js_1 = __webpack_require__(67);
const content_type_js_1 = __webpack_require__(89);
const end_stream_js_1 = __webpack_require__(90);
const error_json_js_1 = __webpack_require__(91);
const headers_js_1 = __webpack_require__(92);
const http_status_js_1 = __webpack_require__(93);
const parse_timeout_js_1 = __webpack_require__(94);
const query_params_js_1 = __webpack_require__(95);
const trailer_mux_js_1 = __webpack_require__(96);
const version_js_1 = __webpack_require__(97);
const compression_js_1 = __webpack_require__(63);
const serialization_js_1 = __webpack_require__(83);
const universal_handler_js_1 = __webpack_require__(84);
const universal_js_1 = __webpack_require__(85);
const async_iterable_js_1 = __webpack_require__(61);
const content_type_matcher_js_1 = __webpack_require__(78);
const create_method_url_js_1 = __webpack_require__(79);
const invoke_implementation_js_1 = __webpack_require__(80);
const protocolName = "connect";
const methodPost = "POST";
const methodGet = "GET";
/**
 * Create a factory that creates Connect handlers.
 */
function createHandlerFactory(options) {
    const opt = (0, universal_handler_js_1.validateUniversalHandlerOptions)(options);
    const endStreamSerialization = (0, end_stream_js_1.createEndStreamSerialization)(opt.jsonOptions);
    function fact(spec) {
        let h;
        let contentTypeRegExp;
        const serialization = (0, serialization_js_1.createMethodSerializationLookup)(spec.method, opt.binaryOptions, opt.jsonOptions, opt);
        switch (spec.kind) {
            case protobuf_1.MethodKind.Unary:
                contentTypeRegExp = content_type_js_1.contentTypeUnaryRegExp;
                h = createUnaryHandler(opt, spec, serialization);
                break;
            default:
                contentTypeRegExp = content_type_js_1.contentTypeStreamRegExp;
                h = createStreamHandler(opt, spec, serialization, endStreamSerialization);
                break;
        }
        const allowedMethods = [methodPost];
        if (spec.method.idempotency === protobuf_1.MethodIdempotency.NoSideEffects) {
            allowedMethods.push(methodGet);
        }
        return Object.assign(h, {
            protocolNames: [protocolName],
            supportedContentType: (0, content_type_matcher_js_1.contentTypeMatcher)(contentTypeRegExp),
            allowedMethods,
            requestPath: (0, create_method_url_js_1.createMethodUrl)("/", spec.service, spec.method),
            service: spec.service,
            method: spec.method,
        });
    }
    fact.protocolName = protocolName;
    return fact;
}
function createUnaryHandler(opt, spec, serialization) {
    return async function handle(req) {
        const isGet = req.method == methodGet;
        if (isGet && spec.method.idempotency != protobuf_1.MethodIdempotency.NoSideEffects) {
            return universal_js_1.uResponseMethodNotAllowed;
        }
        const queryParams = new URL(req.url).searchParams;
        const compressionRequested = isGet
            ? queryParams.get(query_params_js_1.paramCompression)
            : req.header.get(headers_js_1.headerUnaryEncoding);
        const type = isGet
            ? (0, content_type_js_1.parseEncodingQuery)(queryParams.get(query_params_js_1.paramEncoding))
            : (0, content_type_js_1.parseContentType)(req.header.get(headers_js_1.headerContentType));
        if (type == undefined || type.stream) {
            return universal_js_1.uResponseUnsupportedMediaType;
        }
        const timeout = (0, parse_timeout_js_1.parseTimeout)(req.header.get(headers_js_1.headerTimeout), opt.maxTimeoutMs);
        const context = (0, implementation_js_1.createHandlerContext)(Object.assign(Object.assign({}, spec), { requestMethod: req.method, protocolName, timeoutMs: timeout.timeoutMs, shutdownSignal: opt.shutdownSignal, requestSignal: req.signal, requestHeader: req.header, url: req.url, responseHeader: {
                [headers_js_1.headerContentType]: type.binary
                    ? content_type_js_1.contentTypeUnaryProto
                    : content_type_js_1.contentTypeUnaryJson,
            }, contextValues: req.contextValues }));
        const compression = (0, compression_js_1.compressionNegotiate)(opt.acceptCompression, compressionRequested, req.header.get(headers_js_1.headerUnaryAcceptEncoding), headers_js_1.headerUnaryAcceptEncoding);
        let status = universal_js_1.uResponseOk.status;
        let body;
        try {
            if (opt.requireConnectProtocolHeader) {
                if (isGet) {
                    (0, version_js_1.requireProtocolVersionParam)(queryParams);
                }
                else {
                    (0, version_js_1.requireProtocolVersionHeader)(req.header);
                }
            }
            // raise compression error to serialize it as a error response
            if (compression.error) {
                throw compression.error;
            }
            // raise timeout parsing error to serialize it as a trailer status
            if (timeout.error) {
                throw timeout.error;
            }
            let reqBody;
            if (isGet) {
                reqBody = await readUnaryMessageFromQuery(opt.readMaxBytes, compression.request, queryParams);
            }
            else {
                reqBody = await readUnaryMessageFromBody(opt.readMaxBytes, compression.request, req);
            }
            const input = parseUnaryMessage(spec.method, type.binary, serialization, reqBody);
            const output = await (0, invoke_implementation_js_1.invokeUnaryImplementation)(spec, context, input, opt.interceptors);
            body = serialization.getO(type.binary).serialize(output);
        }
        catch (e) {
            let error;
            if (e instanceof connect_error_js_1.ConnectError) {
                error = e;
            }
            else {
                error = new connect_error_js_1.ConnectError("internal error", code_js_1.Code.Internal, undefined, undefined, e);
            }
            status = (0, http_status_js_1.codeToHttpStatus)(error.code);
            context.responseHeader.set(headers_js_1.headerContentType, content_type_js_1.contentTypeUnaryJson);
            error.metadata.forEach((value, key) => {
                context.responseHeader.set(key, value);
            });
            body = (0, error_json_js_1.errorToJsonBytes)(error, opt.jsonOptions);
        }
        finally {
            context.abort();
        }
        if (compression.response && body.byteLength >= opt.compressMinBytes) {
            body = await compression.response.compress(body);
            context.responseHeader.set(headers_js_1.headerUnaryEncoding, compression.response.name);
        }
        const header = (0, trailer_mux_js_1.trailerMux)(context.responseHeader, context.responseTrailer);
        header.set(headers_js_1.headerUnaryContentLength, body.byteLength.toString(10));
        return {
            status,
            body: (0, async_iterable_js_1.createAsyncIterable)([body]),
            header,
        };
    };
}
async function readUnaryMessageFromBody(readMaxBytes, compression, request) {
    if (typeof request.body == "object" &&
        request.body !== null &&
        Symbol.asyncIterator in request.body) {
        let reqBytes = await (0, async_iterable_js_1.readAllBytes)(request.body, readMaxBytes, request.header.get(headers_js_1.headerUnaryContentLength));
        if (compression) {
            reqBytes = await compression.decompress(reqBytes, readMaxBytes);
        }
        return reqBytes;
    }
    return request.body;
}
async function readUnaryMessageFromQuery(readMaxBytes, compression, queryParams) {
    var _a;
    const base64 = queryParams.get(query_params_js_1.paramBase64);
    const message = (_a = queryParams.get(query_params_js_1.paramMessage)) !== null && _a !== void 0 ? _a : "";
    let decoded;
    if (base64 === "1") {
        decoded = protobuf_1.protoBase64.dec(message);
    }
    else {
        decoded = new TextEncoder().encode(message);
    }
    if (compression) {
        decoded = await compression.decompress(decoded, readMaxBytes);
    }
    return decoded;
}
function parseUnaryMessage(method, useBinaryFormat, serialization, input) {
    if (input instanceof Uint8Array) {
        return serialization.getI(useBinaryFormat).parse(input);
    }
    if (useBinaryFormat) {
        throw new connect_error_js_1.ConnectError("received parsed JSON request body, but content-type indicates binary format", code_js_1.Code.Internal);
    }
    try {
        return method.I.fromJson(input);
    }
    catch (e) {
        throw connect_error_js_1.ConnectError.from(e, code_js_1.Code.InvalidArgument);
    }
}
function createStreamHandler(opt, spec, serialization, endStreamSerialization) {
    return async function handle(req) {
        (0, universal_js_1.assertByteStreamRequest)(req);
        const type = (0, content_type_js_1.parseContentType)(req.header.get(headers_js_1.headerContentType));
        if (type == undefined || !type.stream) {
            return universal_js_1.uResponseUnsupportedMediaType;
        }
        if (req.method !== methodPost) {
            return universal_js_1.uResponseMethodNotAllowed;
        }
        const timeout = (0, parse_timeout_js_1.parseTimeout)(req.header.get(headers_js_1.headerTimeout), opt.maxTimeoutMs);
        const context = (0, implementation_js_1.createHandlerContext)(Object.assign(Object.assign({}, spec), { requestMethod: req.method, protocolName, timeoutMs: timeout.timeoutMs, shutdownSignal: opt.shutdownSignal, requestSignal: req.signal, requestHeader: req.header, url: req.url, responseHeader: {
                [headers_js_1.headerContentType]: type.binary
                    ? content_type_js_1.contentTypeStreamProto
                    : content_type_js_1.contentTypeStreamJson,
            }, contextValues: req.contextValues }));
        const compression = (0, compression_js_1.compressionNegotiate)(opt.acceptCompression, req.header.get(headers_js_1.headerStreamEncoding), req.header.get(headers_js_1.headerStreamAcceptEncoding), headers_js_1.headerStreamAcceptEncoding);
        if (compression.response) {
            context.responseHeader.set(headers_js_1.headerStreamEncoding, compression.response.name);
        }
        // We split the pipeline into two parts: The request iterator, and the
        // response iterator. We do this because the request iterator is responsible
        // for parsing the request body, and we don't want write errors of the response
        // iterator to affect the request iterator.
        const inputIt = (0, async_iterable_js_1.pipe)(req.body, (0, async_iterable_js_1.transformPrepend)(() => {
            if (opt.requireConnectProtocolHeader) {
                (0, version_js_1.requireProtocolVersionHeader)(req.header);
            }
            // raise compression error to serialize it as the end stream response
            if (compression.error)
                throw compression.error;
            // raise timeout parsing error to serialize it as a trailer status
            if (timeout.error)
                throw timeout.error;
            return undefined;
        }), (0, async_iterable_js_1.transformSplitEnvelope)(opt.readMaxBytes), (0, async_iterable_js_1.transformDecompressEnvelope)(compression.request, opt.readMaxBytes), (0, async_iterable_js_1.transformParseEnvelope)(serialization.getI(type.binary), end_stream_js_1.endStreamFlag));
        const it = (0, invoke_implementation_js_1.transformInvokeImplementation)(spec, context, opt.interceptors)(inputIt)[Symbol.asyncIterator]();
        const outputIt = (0, async_iterable_js_1.pipe)(
        // We wrap the iterator in an async iterator to ensure that the
        // abort signal is aborted when the iterator is done.
        {
            [Symbol.asyncIterator]() {
                return {
                    next: () => it.next(),
                    throw: (e) => {
                        var _a, _b;
                        context.abort(e);
                        return (_b = (_a = it.throw) === null || _a === void 0 ? void 0 : _a.call(it, e)) !== null && _b !== void 0 ? _b : Promise.reject({ done: true });
                    },
                    return: (v) => {
                        var _a, _b;
                        context.abort();
                        return ((_b = (_a = it.return) === null || _a === void 0 ? void 0 : _a.call(it, v)) !== null && _b !== void 0 ? _b : Promise.resolve({ done: true, value: v }));
                    },
                };
            },
        }, (0, async_iterable_js_1.transformSerializeEnvelope)(serialization.getO(type.binary)), (0, async_iterable_js_1.transformCatchFinally)((e) => {
            context.abort();
            const end = {
                metadata: context.responseTrailer,
            };
            if (e instanceof connect_error_js_1.ConnectError) {
                end.error = e;
            }
            else if (e !== undefined) {
                end.error = new connect_error_js_1.ConnectError("internal error", code_js_1.Code.Internal, undefined, undefined, e);
            }
            return {
                flags: end_stream_js_1.endStreamFlag,
                data: endStreamSerialization.serialize(end),
            };
        }), (0, async_iterable_js_1.transformCompressEnvelope)(compression.response, opt.compressMinBytes), (0, async_iterable_js_1.transformJoinEnvelopes)(), { propagateDownStreamError: true });
        return Object.assign(Object.assign({}, universal_js_1.uResponseOk), {
            // We wait for the first response body bytes before resolving, so that
            // implementations have a chance to add headers before an adapter commits
            // them to the wire.
            body: await (0, async_iterable_js_1.untilFirst)(outputIt), header: context.responseHeader });
    };
}


/***/ }),
/* 89 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.contentTypeStreamJson = exports.contentTypeStreamProto = exports.contentTypeUnaryJson = exports.contentTypeUnaryProto = exports.contentTypeStreamRegExp = exports.contentTypeUnaryRegExp = exports.contentTypeRegExp = void 0;
exports.parseContentType = parseContentType;
exports.parseEncodingQuery = parseEncodingQuery;
/**
 * Regular Expression that matches any valid Connect Content-Type header value.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.contentTypeRegExp = /^application\/(connect\+)?(?:(json)(?:; ?charset=utf-?8)?|(proto))$/i;
/**
 * Regular Expression that matches a Connect unary Content-Type header value.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.contentTypeUnaryRegExp = /^application\/(?:json(?:; ?charset=utf-?8)?|proto)$/i;
/**
 * Regular Expression that matches a Connect streaming Content-Type header value.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.contentTypeStreamRegExp = /^application\/connect\+?(?:json(?:; ?charset=utf-?8)?|proto)$/i;
exports.contentTypeUnaryProto = "application/proto";
exports.contentTypeUnaryJson = "application/json";
exports.contentTypeStreamProto = "application/connect+proto";
exports.contentTypeStreamJson = "application/connect+json";
const encodingProto = "proto";
const encodingJson = "json";
/**
 * Parse a Connect Content-Type header.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function parseContentType(contentType) {
    const match = contentType === null || contentType === void 0 ? void 0 : contentType.match(exports.contentTypeRegExp);
    if (!match) {
        return undefined;
    }
    const stream = !!match[1];
    const binary = !!match[3];
    return { stream, binary };
}
/**
 * Parse a Connect Get encoding query parameter.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function parseEncodingQuery(encoding) {
    switch (encoding) {
        case encodingProto:
            return { stream: false, binary: true };
        case encodingJson:
            return { stream: false, binary: false };
        default:
            return undefined;
    }
}


/***/ }),
/* 90 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.endStreamFlag = void 0;
exports.endStreamFromJson = endStreamFromJson;
exports.endStreamToJson = endStreamToJson;
exports.createEndStreamSerialization = createEndStreamSerialization;
const error_json_js_1 = __webpack_require__(91);
const http_headers_js_1 = __webpack_require__(9);
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
/**
 * endStreamFlag indicates that the data in a EnvelopedMessage
 * is a EndStreamResponse of the Connect protocol.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.endStreamFlag = 0b00000010;
/**
 * Parse an EndStreamResponse of the Connect protocol.
 * Throws a ConnectError on malformed input.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function endStreamFromJson(data) {
    const parseErr = new connect_error_js_1.ConnectError("invalid end stream", code_js_1.Code.Unknown);
    let jsonValue;
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        jsonValue = JSON.parse(typeof data == "string" ? data : new TextDecoder().decode(data));
    }
    catch (e) {
        throw parseErr;
    }
    if (typeof jsonValue != "object" ||
        jsonValue == null ||
        Array.isArray(jsonValue)) {
        throw parseErr;
    }
    const metadata = new Headers();
    if ("metadata" in jsonValue) {
        if (typeof jsonValue.metadata != "object" ||
            jsonValue.metadata == null ||
            Array.isArray(jsonValue.metadata)) {
            throw parseErr;
        }
        for (const [key, values] of Object.entries(jsonValue.metadata)) {
            if (!Array.isArray(values) ||
                values.some((value) => typeof value != "string")) {
                throw parseErr;
            }
            for (const value of values) {
                metadata.append(key, value);
            }
        }
    }
    const error = "error" in jsonValue && jsonValue.error != null
        ? (0, error_json_js_1.errorFromJson)(jsonValue.error, metadata, parseErr)
        : undefined;
    return { metadata, error };
}
/**
 * Serialize the given EndStreamResponse to JSON.
 *
 * The JSON serialization options are required to produce the optional
 * human-readable representation of error details if the detail uses
 * google.protobuf.Any.
 *
 * See https://connectrpc.com/docs/protocol#error-end-stream
 *
 * @private Internal code, does not follow semantic versioning.
 */
function endStreamToJson(metadata, error, jsonWriteOptions) {
    const es = {};
    if (error !== undefined) {
        es.error = (0, error_json_js_1.errorToJson)(error, jsonWriteOptions);
        metadata = (0, http_headers_js_1.appendHeaders)(metadata, error.metadata);
    }
    let hasMetadata = false;
    const md = {};
    metadata.forEach((value, key) => {
        hasMetadata = true;
        md[key] = [value];
    });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (hasMetadata) {
        es.metadata = md;
    }
    return es;
}
/**
 * Create a Serialization object that serializes a Connect EndStreamResponse.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createEndStreamSerialization(options) {
    const textEncoder = new TextEncoder();
    return {
        serialize(data) {
            try {
                const jsonObject = endStreamToJson(data.metadata, data.error, options);
                const jsonString = JSON.stringify(jsonObject);
                return textEncoder.encode(jsonString);
            }
            catch (e) {
                const m = e instanceof Error ? e.message : String(e);
                throw new connect_error_js_1.ConnectError(`failed to serialize EndStreamResponse: ${m}`, code_js_1.Code.Internal);
            }
        },
        parse(data) {
            try {
                return endStreamFromJson(data);
            }
            catch (e) {
                const m = e instanceof Error ? e.message : String(e);
                throw new connect_error_js_1.ConnectError(`failed to parse EndStreamResponse: ${m}`, code_js_1.Code.InvalidArgument);
            }
        },
    };
}


/***/ }),
/* 91 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.errorFromJson = errorFromJson;
exports.errorFromJsonBytes = errorFromJsonBytes;
exports.errorToJson = errorToJson;
exports.errorToJsonBytes = errorToJsonBytes;
const protobuf_1 = __webpack_require__(10);
const code_js_1 = __webpack_require__(7);
const connect_error_js_1 = __webpack_require__(6);
const code_string_js_1 = __webpack_require__(8);
/**
 * Parse a Connect error from a JSON value.
 * Will return a ConnectError, and throw the provided fallback if parsing failed.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function errorFromJson(jsonValue, metadata, fallback) {
    var _a;
    if (metadata) {
        new Headers(metadata).forEach((value, key) => fallback.metadata.append(key, value));
    }
    if (typeof jsonValue !== "object" ||
        jsonValue == null ||
        Array.isArray(jsonValue)) {
        throw fallback;
    }
    let code = fallback.code;
    if ("code" in jsonValue && typeof jsonValue.code === "string") {
        code = (_a = (0, code_string_js_1.codeFromString)(jsonValue.code)) !== null && _a !== void 0 ? _a : code;
    }
    const message = jsonValue.message;
    if (message != null && typeof message !== "string") {
        throw fallback;
    }
    const error = new connect_error_js_1.ConnectError(message !== null && message !== void 0 ? message : "", code, metadata);
    if ("details" in jsonValue && Array.isArray(jsonValue.details)) {
        for (const detail of jsonValue.details) {
            if (detail === null ||
                typeof detail != "object" ||
                Array.isArray(detail) ||
                typeof detail.type != "string" ||
                typeof detail.value != "string") {
                throw fallback;
            }
            try {
                error.details.push({
                    type: detail.type,
                    value: protobuf_1.protoBase64.dec(detail.value),
                    debug: detail.debug,
                });
            }
            catch (e) {
                throw fallback;
            }
        }
    }
    return error;
}
/**
 * Parse a Connect error from a serialized JSON value.
 * Will return a ConnectError, and throw the provided fallback if parsing failed.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function errorFromJsonBytes(bytes, metadata, fallback) {
    let jsonValue;
    try {
        jsonValue = JSON.parse(new TextDecoder().decode(bytes));
    }
    catch (e) {
        throw fallback;
    }
    return errorFromJson(jsonValue, metadata, fallback);
}
/**
 * Serialize the given error to JSON.
 *
 * The JSON serialization options are required to produce the optional
 * human-readable representation in the "debug" key if the detail uses
 * google.protobuf.Any. If serialization of the "debug" value fails, it
 * is silently disregarded.
 *
 * See https://connectrpc.com/docs/protocol#error-end-stream
 *
 * @private Internal code, does not follow semantic versioning.
 */
function errorToJson(error, jsonWriteOptions) {
    const o = {
        code: (0, code_string_js_1.codeToString)(error.code),
    };
    if (error.rawMessage.length > 0) {
        o.message = error.rawMessage;
    }
    if (error.details.length > 0) {
        o.details = error.details
            .map((value) => {
            if ("getType" in value) {
                const i = {
                    type: value.getType().typeName,
                    value: value.toBinary(),
                };
                try {
                    i.debug = value.toJson(jsonWriteOptions);
                }
                catch (e) {
                    // We deliberately ignore errors that may occur when serializing
                    // a message to JSON (the message contains an Any).
                    // The rationale is that we are only trying to provide optional
                    // debug information.
                }
                return i;
            }
            return value;
        })
            .map((_a) => {
            var { value } = _a, rest = __rest(_a, ["value"]);
            return (Object.assign(Object.assign({}, rest), { value: protobuf_1.protoBase64.enc(value).replace(/=+$/, "") }));
        });
    }
    return o;
}
/**
 * Serialize the given error to JSON. This calls errorToJson(), but stringifies
 * the result, and converts it into a UInt8Array.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function errorToJsonBytes(error, jsonWriteOptions) {
    const textEncoder = new TextEncoder();
    try {
        const jsonObject = errorToJson(error, jsonWriteOptions);
        const jsonString = JSON.stringify(jsonObject);
        return textEncoder.encode(jsonString);
    }
    catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        throw new connect_error_js_1.ConnectError(`failed to serialize Connect Error: ${m}`, code_js_1.Code.Internal);
    }
}


/***/ }),
/* 92 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.headerUserAgent = exports.headerProtocolVersion = exports.headerTimeout = exports.headerStreamAcceptEncoding = exports.headerUnaryAcceptEncoding = exports.headerStreamEncoding = exports.headerUnaryEncoding = exports.headerUnaryContentLength = exports.headerContentType = void 0;
/**
 * @private Internal code, does not follow semantic versioning.
 */
exports.headerContentType = "Content-Type";
exports.headerUnaryContentLength = "Content-Length";
exports.headerUnaryEncoding = "Content-Encoding";
exports.headerStreamEncoding = "Connect-Content-Encoding";
exports.headerUnaryAcceptEncoding = "Accept-Encoding";
exports.headerStreamAcceptEncoding = "Connect-Accept-Encoding";
exports.headerTimeout = "Connect-Timeout-Ms";
exports.headerProtocolVersion = "Connect-Protocol-Version";
exports.headerUserAgent = "User-Agent";


/***/ }),
/* 93 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.codeFromHttpStatus = codeFromHttpStatus;
exports.codeToHttpStatus = codeToHttpStatus;
const code_js_1 = __webpack_require__(7);
/**
 * Determine the Connect error code for the given HTTP status code.
 * See https://connectrpc.com/docs/protocol/#http-to-error-code
 *
 * @private Internal code, does not follow semantic versioning.
 */
function codeFromHttpStatus(httpStatus) {
    switch (httpStatus) {
        case 400: // Bad Request
            return code_js_1.Code.Internal;
        case 401: // Unauthorized
            return code_js_1.Code.Unauthenticated;
        case 403: // Forbidden
            return code_js_1.Code.PermissionDenied;
        case 404: // Not Found
            return code_js_1.Code.Unimplemented;
        case 429: // Too Many Requests
            return code_js_1.Code.Unavailable;
        case 502: // Bad Gateway
            return code_js_1.Code.Unavailable;
        case 503: // Service Unavailable
            return code_js_1.Code.Unavailable;
        case 504: // Gateway Timeout
            return code_js_1.Code.Unavailable;
        default:
            return code_js_1.Code.Unknown;
    }
}
/**
 * Returns a HTTP status code for the given Connect code.
 * See https://connectrpc.com/docs/protocol#error-codes
 *
 * @private Internal code, does not follow semantic versioning.
 */
function codeToHttpStatus(code) {
    switch (code) {
        case code_js_1.Code.Canceled:
            return 499; // Client Closed Request
        case code_js_1.Code.Unknown:
            return 500; // Internal Server Error
        case code_js_1.Code.InvalidArgument:
            return 400; // Bad Request
        case code_js_1.Code.DeadlineExceeded:
            return 504; // Gateway Timeout
        case code_js_1.Code.NotFound:
            return 404; // Not Found
        case code_js_1.Code.AlreadyExists:
            return 409; // Conflict
        case code_js_1.Code.PermissionDenied:
            return 403; // Forbidden
        case code_js_1.Code.ResourceExhausted:
            return 429; // Too Many Requests
        case code_js_1.Code.FailedPrecondition:
            return 400; // Bad Request
        case code_js_1.Code.Aborted:
            return 409; // Conflict
        case code_js_1.Code.OutOfRange:
            return 400; // Bad Request
        case code_js_1.Code.Unimplemented:
            return 501; // Not Implemented
        case code_js_1.Code.Internal:
            return 500; // Internal Server Error
        case code_js_1.Code.Unavailable:
            return 503; // Service Unavailable
        case code_js_1.Code.DataLoss:
            return 500; // Internal Server Error
        case code_js_1.Code.Unauthenticated:
            return 401; // Unauthorized
        default:
            return 500; // same as CodeUnknown
    }
}


/***/ }),
/* 94 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseTimeout = parseTimeout;
const code_js_1 = __webpack_require__(7);
const connect_error_js_1 = __webpack_require__(6);
/**
 * Parse a Connect Timeout (Deadline) header.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function parseTimeout(value, maxTimeoutMs) {
    if (value === null) {
        return {};
    }
    const results = /^\d{1,10}$/.exec(value);
    if (results === null) {
        return {
            error: new connect_error_js_1.ConnectError(`protocol error: invalid connect timeout value: ${value}`, code_js_1.Code.InvalidArgument),
        };
    }
    const timeoutMs = parseInt(results[0]);
    if (timeoutMs > maxTimeoutMs) {
        return {
            timeoutMs: timeoutMs,
            error: new connect_error_js_1.ConnectError(`timeout ${timeoutMs}ms must be <= ${maxTimeoutMs}`, code_js_1.Code.InvalidArgument),
        };
    }
    return {
        timeoutMs: parseInt(results[0]),
    };
}


/***/ }),
/* 95 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.paramMessage = exports.paramBase64 = exports.paramCompression = exports.paramEncoding = exports.paramConnectVersion = void 0;
/**
 * @private Internal code, does not follow semantic versioning.
 */
exports.paramConnectVersion = "connect";
exports.paramEncoding = "encoding";
exports.paramCompression = "compression";
exports.paramBase64 = "base64";
exports.paramMessage = "message";


/***/ }),
/* 96 */
/***/ ((__unused_webpack_module, exports) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.trailerDemux = trailerDemux;
exports.trailerMux = trailerMux;
/**
 * In unary RPCs, Connect transports trailing metadata as response header
 * fields, prefixed with "trailer-".
 *
 * This function demuxes headers and trailers into two separate Headers
 * objects.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function trailerDemux(header) {
    const h = new Headers(), t = new Headers();
    header.forEach((value, key) => {
        if (key.toLowerCase().startsWith("trailer-")) {
            t.append(key.substring(8), value);
        }
        else {
            h.append(key, value);
        }
    });
    return [h, t];
}
/**
 * In unary RPCs, Connect transports trailing metadata as response header
 * fields, prefixed with "trailer-".
 *
 * This function muxes a header and a trailer into a single Headers object.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function trailerMux(header, trailer) {
    const h = new Headers(header);
    trailer.forEach((value, key) => {
        h.append(`trailer-${key}`, value);
    });
    return h;
}


/***/ }),
/* 97 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.protocolVersion = void 0;
exports.requireProtocolVersionHeader = requireProtocolVersionHeader;
exports.requireProtocolVersionParam = requireProtocolVersionParam;
const headers_js_1 = __webpack_require__(92);
const query_params_js_1 = __webpack_require__(95);
const connect_error_js_1 = __webpack_require__(6);
const code_js_1 = __webpack_require__(7);
/**
 * The only know value for the header Connect-Protocol-Version.
 *
 * @private Internal code, does not follow semantic versioning.
 */
exports.protocolVersion = "1";
/**
 * Requires the Connect-Protocol-Version header to be present with the expected
 * value. Raises a ConnectError with Code.InvalidArgument otherwise.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function requireProtocolVersionHeader(requestHeader) {
    const v = requestHeader.get(headers_js_1.headerProtocolVersion);
    if (v === null) {
        throw new connect_error_js_1.ConnectError(`missing required header: set ${headers_js_1.headerProtocolVersion} to "${exports.protocolVersion}"`, code_js_1.Code.InvalidArgument);
    }
    else if (v !== exports.protocolVersion) {
        throw new connect_error_js_1.ConnectError(`${headers_js_1.headerProtocolVersion} must be "${exports.protocolVersion}": got "${v}"`, code_js_1.Code.InvalidArgument);
    }
}
/**
 * Requires the connect query parameter to be present with the expected value.
 * Raises a ConnectError with Code.InvalidArgument otherwise.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function requireProtocolVersionParam(queryParams) {
    const v = queryParams.get(query_params_js_1.paramConnectVersion);
    if (v === null) {
        throw new connect_error_js_1.ConnectError(`missing required parameter: set ${query_params_js_1.paramConnectVersion} to "v${exports.protocolVersion}"`, code_js_1.Code.InvalidArgument);
    }
    else if (v !== `v${exports.protocolVersion}`) {
        throw new connect_error_js_1.ConnectError(`${query_params_js_1.paramConnectVersion} must be "v${exports.protocolVersion}": got "${v}"`, code_js_1.Code.InvalidArgument);
    }
}


/***/ }),
/* 98 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.cors = void 0;
const connect = __webpack_require__(92);
const grpc = __webpack_require__(73);
const grpcWeb = __webpack_require__(72);
/**
 * CORS prevents rogue scripts in a web browser from making arbitrary requests
 * to other web servers.
 *
 * This object provides helpful constants to configure CORS middleware for
 * cross-domain requests with the protocols supported by Connect.
 *
 * Make sure to add application-specific headers that your application
 * uses as well.
 */
exports.cors = {
    /**
     * Request methods that scripts running in the browser are permitted to use.
     *
     * To support cross-domain requests with the protocols supported by Connect,
     * these headers fields must be included in the preflight response header
     * Access-Control-Allow-Methods.
     */
    allowedMethods: ["POST", "GET"],
    /**
     * Header fields that scripts running in the browser are permitted to send.
     *
     * To support cross-domain requests with the protocols supported by Connect,
     * these field names must be included in the preflight response header
     * Access-Control-Allow-Headers.
     *
     * Make sure to include any application-specific headers your browser client
     * may send.
     */
    allowedHeaders: [
        connect.headerContentType,
        connect.headerProtocolVersion,
        connect.headerTimeout,
        connect.headerStreamEncoding, // Unused in web browsers, but added for future-proofing
        connect.headerStreamAcceptEncoding, // Unused in web browsers, but added for future-proofing
        connect.headerUnaryEncoding, // Unused in web browsers, but added for future-proofing
        connect.headerUnaryAcceptEncoding, // Unused in web browsers, but added for future-proofing
        grpc.headerMessageType, // Unused in web browsers, but added for future-proofing
        grpcWeb.headerXGrpcWeb,
        grpcWeb.headerXUserAgent,
        grpcWeb.headerTimeout,
    ],
    /**
     * Header fields that scripts running the browser are permitted to see.
     *
     * To support cross-domain requests with the protocols supported by Connect,
     * these field names must be included in header Access-Control-Expose-Headers
     * of the actual response.
     *
     * Make sure to include any application-specific headers your browser client
     * should see. If your application uses trailers, they will be sent as header
     * fields with a `Trailer-` prefix for Connect unary RPCs - make sure to
     * expose them as well if you want them to be visible in all supported
     * protocols.
     */
    exposedHeaders: [
        grpcWeb.headerGrpcStatus, // Crucial for gRPC-web
        grpcWeb.headerGrpcMessage, // Crucial for gRPC-web
        grpcWeb.headerStatusDetailsBin, // Error details in gRPC, gRPC-web
        connect.headerUnaryEncoding, // Unused in web browsers, but added for future-proofing
        connect.headerStreamEncoding, // Unused in web browsers, but added for future-proofing
    ],
};


/***/ }),
/* 99 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createRouterTransport = createRouterTransport;
const transport_js_1 = __webpack_require__(100);
const universal_handler_client_js_1 = __webpack_require__(105);
const router_js_1 = __webpack_require__(66);
/**
 * Creates a Transport that routes requests to the configured router. Useful for testing
 * and calling services running in the same process.
 *
 * This can be used to test both client logic by using this to stub/mock the backend,
 * and to test server logic by using this to run without needing to spin up a server.
 */
function createRouterTransport(routes, options) {
    var _a, _b;
    const router = (0, router_js_1.createConnectRouter)(Object.assign(Object.assign({}, ((_a = options === null || options === void 0 ? void 0 : options.router) !== null && _a !== void 0 ? _a : {})), { connect: true }));
    routes(router);
    return (0, transport_js_1.createTransport)(Object.assign({ httpClient: (0, universal_handler_client_js_1.createUniversalHandlerClient)(router.handlers), baseUrl: "https://in-memory", useBinaryFormat: true, interceptors: [], acceptCompression: [], sendCompression: null, compressMinBytes: Number.MAX_SAFE_INTEGER, readMaxBytes: Number.MAX_SAFE_INTEGER, writeMaxBytes: Number.MAX_SAFE_INTEGER }, ((_b = options === null || options === void 0 ? void 0 : options.transport) !== null && _b !== void 0 ? _b : {})));
}


/***/ }),
/* 100 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createTransport = createTransport;
const protobuf_1 = __webpack_require__(10);
const request_header_js_1 = __webpack_require__(101);
const headers_js_1 = __webpack_require__(92);
const validate_response_js_1 = __webpack_require__(102);
const trailer_mux_js_1 = __webpack_require__(96);
const error_json_js_1 = __webpack_require__(91);
const end_stream_js_1 = __webpack_require__(90);
const get_request_js_1 = __webpack_require__(103);
const code_js_1 = __webpack_require__(7);
const connect_error_js_1 = __webpack_require__(6);
const http_headers_js_1 = __webpack_require__(9);
const async_iterable_js_1 = __webpack_require__(61);
const create_method_url_js_1 = __webpack_require__(79);
const run_call_js_1 = __webpack_require__(104);
const serialization_js_1 = __webpack_require__(83);
const context_values_js_1 = __webpack_require__(69);
/**
 * Create a Transport for the Connect protocol.
 */
function createTransport(opt) {
    return {
        async unary(service, method, signal, timeoutMs, header, message, contextValues) {
            const serialization = (0, serialization_js_1.createMethodSerializationLookup)(method, opt.binaryOptions, opt.jsonOptions, opt);
            timeoutMs =
                timeoutMs === undefined
                    ? opt.defaultTimeoutMs
                    : timeoutMs <= 0
                        ? undefined
                        : timeoutMs;
            return await (0, run_call_js_1.runUnaryCall)({
                interceptors: opt.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: false,
                    service,
                    method,
                    url: (0, create_method_url_js_1.createMethodUrl)(opt.baseUrl, service, method),
                    init: {},
                    header: (0, request_header_js_1.requestHeaderWithCompression)(method.kind, opt.useBinaryFormat, timeoutMs, header, opt.acceptCompression, opt.sendCompression, true),
                    contextValues: contextValues !== null && contextValues !== void 0 ? contextValues : (0, context_values_js_1.createContextValues)(),
                    message,
                },
                next: async (req) => {
                    var _a;
                    let requestBody = serialization
                        .getI(opt.useBinaryFormat)
                        .serialize(req.message);
                    if (opt.sendCompression &&
                        requestBody.byteLength > opt.compressMinBytes) {
                        requestBody = await opt.sendCompression.compress(requestBody);
                        req.header.set(headers_js_1.headerUnaryEncoding, opt.sendCompression.name);
                    }
                    else {
                        req.header.delete(headers_js_1.headerUnaryEncoding);
                    }
                    const useGet = opt.useHttpGet === true &&
                        method.idempotency === protobuf_1.MethodIdempotency.NoSideEffects;
                    let body;
                    if (useGet) {
                        req = (0, get_request_js_1.transformConnectPostToGetRequest)(req, requestBody, opt.useBinaryFormat);
                    }
                    else {
                        body = (0, async_iterable_js_1.createAsyncIterable)([requestBody]);
                    }
                    const universalResponse = await opt.httpClient({
                        url: req.url,
                        method: (_a = req.init.method) !== null && _a !== void 0 ? _a : "POST",
                        header: req.header,
                        signal: req.signal,
                        body,
                    });
                    const { compression, isUnaryError, unaryError } = (0, validate_response_js_1.validateResponseWithCompression)(method.kind, opt.acceptCompression, opt.useBinaryFormat, universalResponse.status, universalResponse.header);
                    const [header, trailer] = (0, trailer_mux_js_1.trailerDemux)(universalResponse.header);
                    let responseBody = await (0, async_iterable_js_1.pipeTo)(universalResponse.body, (0, async_iterable_js_1.sinkAllBytes)(opt.readMaxBytes, universalResponse.header.get(headers_js_1.headerUnaryContentLength)), { propagateDownStreamError: false });
                    if (compression) {
                        responseBody = await compression.decompress(responseBody, opt.readMaxBytes);
                    }
                    if (isUnaryError) {
                        throw (0, error_json_js_1.errorFromJsonBytes)(responseBody, (0, http_headers_js_1.appendHeaders)(header, trailer), unaryError);
                    }
                    return {
                        stream: false,
                        service,
                        method,
                        header,
                        message: serialization
                            .getO(opt.useBinaryFormat)
                            .parse(responseBody),
                        trailer,
                    };
                },
            });
        },
        async stream(service, method, signal, timeoutMs, header, input, contextValues) {
            const serialization = (0, serialization_js_1.createMethodSerializationLookup)(method, opt.binaryOptions, opt.jsonOptions, opt);
            const endStreamSerialization = (0, end_stream_js_1.createEndStreamSerialization)(opt.jsonOptions);
            timeoutMs =
                timeoutMs === undefined
                    ? opt.defaultTimeoutMs
                    : timeoutMs <= 0
                        ? undefined
                        : timeoutMs;
            return (0, run_call_js_1.runStreamingCall)({
                interceptors: opt.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: true,
                    service,
                    method,
                    url: (0, create_method_url_js_1.createMethodUrl)(opt.baseUrl, service, method),
                    init: {
                        method: "POST",
                        redirect: "error",
                        mode: "cors",
                    },
                    header: (0, request_header_js_1.requestHeaderWithCompression)(method.kind, opt.useBinaryFormat, timeoutMs, header, opt.acceptCompression, opt.sendCompression, true),
                    contextValues: contextValues !== null && contextValues !== void 0 ? contextValues : (0, context_values_js_1.createContextValues)(),
                    message: input,
                },
                next: async (req) => {
                    const uRes = await opt.httpClient({
                        url: req.url,
                        method: "POST",
                        header: req.header,
                        signal: req.signal,
                        body: (0, async_iterable_js_1.pipe)(req.message, (0, async_iterable_js_1.transformSerializeEnvelope)(serialization.getI(opt.useBinaryFormat)), (0, async_iterable_js_1.transformCompressEnvelope)(opt.sendCompression, opt.compressMinBytes), (0, async_iterable_js_1.transformJoinEnvelopes)(), { propagateDownStreamError: true }),
                    });
                    const { compression } = (0, validate_response_js_1.validateResponseWithCompression)(method.kind, opt.acceptCompression, opt.useBinaryFormat, uRes.status, uRes.header);
                    const res = Object.assign(Object.assign({}, req), { header: uRes.header, trailer: new Headers(), message: (0, async_iterable_js_1.pipe)(uRes.body, (0, async_iterable_js_1.transformSplitEnvelope)(opt.readMaxBytes), (0, async_iterable_js_1.transformDecompressEnvelope)(compression !== null && compression !== void 0 ? compression : null, opt.readMaxBytes), (0, async_iterable_js_1.transformParseEnvelope)(serialization.getO(opt.useBinaryFormat), end_stream_js_1.endStreamFlag, endStreamSerialization), function (iterable) {
                            return __asyncGenerator(this, arguments, function* () {
                                var _a, e_1, _b, _c;
                                let endStreamReceived = false;
                                try {
                                    for (var _d = true, iterable_1 = __asyncValues(iterable), iterable_1_1; iterable_1_1 = yield __await(iterable_1.next()), _a = iterable_1_1.done, !_a; _d = true) {
                                        _c = iterable_1_1.value;
                                        _d = false;
                                        const chunk = _c;
                                        if (chunk.end) {
                                            if (endStreamReceived) {
                                                throw new connect_error_js_1.ConnectError("protocol error: received extra EndStreamResponse", code_js_1.Code.InvalidArgument);
                                            }
                                            endStreamReceived = true;
                                            if (chunk.value.error) {
                                                const error = chunk.value.error;
                                                uRes.header.forEach((value, key) => {
                                                    error.metadata.append(key, value);
                                                });
                                                throw error;
                                            }
                                            chunk.value.metadata.forEach((value, key) => res.trailer.set(key, value));
                                            continue;
                                        }
                                        if (endStreamReceived) {
                                            throw new connect_error_js_1.ConnectError("protocol error: received extra message after EndStreamResponse", code_js_1.Code.InvalidArgument);
                                        }
                                        yield yield __await(chunk.value);
                                    }
                                }
                                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                                finally {
                                    try {
                                        if (!_d && !_a && (_b = iterable_1.return)) yield __await(_b.call(iterable_1));
                                    }
                                    finally { if (e_1) throw e_1.error; }
                                }
                                if (!endStreamReceived) {
                                    throw new connect_error_js_1.ConnectError("protocol error: missing EndStreamResponse", code_js_1.Code.InvalidArgument);
                                }
                            });
                        }, { propagateDownStreamError: true }) });
                    return res;
                },
            });
        },
    };
}


/***/ }),
/* 101 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.requestHeader = requestHeader;
exports.requestHeaderWithCompression = requestHeaderWithCompression;
const protobuf_1 = __webpack_require__(10);
const headers_js_1 = __webpack_require__(92);
const version_js_1 = __webpack_require__(97);
const content_type_js_1 = __webpack_require__(89);
/**
 * Creates headers for a Connect request.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function requestHeader(methodKind, useBinaryFormat, timeoutMs, userProvidedHeaders, setUserAgent) {
    const result = new Headers(userProvidedHeaders !== null && userProvidedHeaders !== void 0 ? userProvidedHeaders : {});
    if (timeoutMs !== undefined) {
        result.set(headers_js_1.headerTimeout, `${timeoutMs}`);
    }
    result.set(headers_js_1.headerContentType, methodKind == protobuf_1.MethodKind.Unary
        ? useBinaryFormat
            ? content_type_js_1.contentTypeUnaryProto
            : content_type_js_1.contentTypeUnaryJson
        : useBinaryFormat
            ? content_type_js_1.contentTypeStreamProto
            : content_type_js_1.contentTypeStreamJson);
    result.set(headers_js_1.headerProtocolVersion, version_js_1.protocolVersion);
    if (setUserAgent && !result.has(headers_js_1.headerUserAgent)) {
        result.set(headers_js_1.headerUserAgent, "connect-es/1.7.0");
    }
    return result;
}
/**
 * Creates headers for a Connect request with compression.
 *
 * Note that we always set the Content-Encoding header for unary methods.
 * It is up to the caller to decide whether to apply compression - and remove
 * the header if compression is not used, for example because the payload is
 * too small to make compression effective.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function requestHeaderWithCompression(methodKind, useBinaryFormat, timeoutMs, userProvidedHeaders, acceptCompression, sendCompression, setUserAgent) {
    const result = requestHeader(methodKind, useBinaryFormat, timeoutMs, userProvidedHeaders, setUserAgent);
    if (sendCompression != null) {
        const name = methodKind == protobuf_1.MethodKind.Unary
            ? headers_js_1.headerUnaryEncoding
            : headers_js_1.headerStreamEncoding;
        result.set(name, sendCompression.name);
    }
    if (acceptCompression.length > 0) {
        const name = methodKind == protobuf_1.MethodKind.Unary
            ? headers_js_1.headerUnaryAcceptEncoding
            : headers_js_1.headerStreamAcceptEncoding;
        result.set(name, acceptCompression.map((c) => c.name).join(","));
    }
    return result;
}


/***/ }),
/* 102 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.validateResponse = validateResponse;
exports.validateResponseWithCompression = validateResponseWithCompression;
const protobuf_1 = __webpack_require__(10);
const code_js_1 = __webpack_require__(7);
const http_status_js_1 = __webpack_require__(93);
const connect_error_js_1 = __webpack_require__(6);
const content_type_js_1 = __webpack_require__(89);
const headers_js_1 = __webpack_require__(92);
/**
 * Validates response status and header for the Connect protocol.
 * Throws a ConnectError if the header indicates an error, or if
 * the content type is unexpected, with the following exception:
 * For unary RPCs with an HTTP error status, this returns an error
 * derived from the HTTP status instead of throwing it, giving an
 * implementation a chance to parse a Connect error from the wire.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function validateResponse(methodKind, useBinaryFormat, status, headers) {
    const mimeType = headers.get(headers_js_1.headerContentType);
    const parsedType = (0, content_type_js_1.parseContentType)(mimeType);
    if (status !== 200) {
        const errorFromStatus = new connect_error_js_1.ConnectError(`HTTP ${status}`, (0, http_status_js_1.codeFromHttpStatus)(status), headers);
        // If parsedType is defined and it is not binary, then this is a unary JSON response
        if (methodKind == protobuf_1.MethodKind.Unary && parsedType && !parsedType.binary) {
            return { isUnaryError: true, unaryError: errorFromStatus };
        }
        throw errorFromStatus;
    }
    const allowedContentType = {
        binary: useBinaryFormat,
        stream: methodKind !== protobuf_1.MethodKind.Unary,
    };
    if ((parsedType === null || parsedType === void 0 ? void 0 : parsedType.binary) !== allowedContentType.binary ||
        parsedType.stream !== allowedContentType.stream) {
        throw new connect_error_js_1.ConnectError(`unsupported content type ${mimeType}`, parsedType === undefined ? code_js_1.Code.Unknown : code_js_1.Code.Internal, headers);
    }
    return { isUnaryError: false };
}
/**
 * Validates response status and header for the Connect protocol.
 * This function is identical to validateResponse(), but also verifies
 * that a given encoding header is acceptable.
 *
 * @private
 */
function validateResponseWithCompression(methodKind, acceptCompression, useBinaryFormat, status, headers) {
    let compression;
    const encoding = headers.get(methodKind == protobuf_1.MethodKind.Unary ? headers_js_1.headerUnaryEncoding : headers_js_1.headerStreamEncoding);
    if (encoding != null && encoding.toLowerCase() !== "identity") {
        compression = acceptCompression.find((c) => c.name === encoding);
        if (!compression) {
            throw new connect_error_js_1.ConnectError(`unsupported response encoding "${encoding}"`, code_js_1.Code.Internal, headers);
        }
    }
    return Object.assign({ compression }, validateResponse(methodKind, useBinaryFormat, status, headers));
}


/***/ }),
/* 103 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.transformConnectPostToGetRequest = transformConnectPostToGetRequest;
const protobuf_1 = __webpack_require__(10);
const headers_js_1 = __webpack_require__(92);
const version_js_1 = __webpack_require__(97);
const contentTypePrefix = "application/";
function encodeMessageForUrl(message, useBase64) {
    if (useBase64) {
        // TODO(jchadwick-buf): Three regex replaces seems excessive.
        // Can we make protoBase64.enc more flexible?
        return protobuf_1.protoBase64
            .enc(message)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }
    else {
        return encodeURIComponent(new TextDecoder().decode(message));
    }
}
/**
 * @private Internal code, does not follow semantic versioning.
 */
function transformConnectPostToGetRequest(request, message, useBase64) {
    let query = `?connect=v${version_js_1.protocolVersion}`;
    const contentType = request.header.get(headers_js_1.headerContentType);
    if ((contentType === null || contentType === void 0 ? void 0 : contentType.indexOf(contentTypePrefix)) === 0) {
        query +=
            "&encoding=" +
                encodeURIComponent(contentType.slice(contentTypePrefix.length));
    }
    const compression = request.header.get(headers_js_1.headerUnaryEncoding);
    if (compression !== null && compression !== "identity") {
        query += "&compression=" + encodeURIComponent(compression);
        // Force base64 for compressed payloads.
        useBase64 = true;
    }
    if (useBase64) {
        query += "&base64=1";
    }
    query += "&message=" + encodeMessageForUrl(message, useBase64);
    const url = request.url + query;
    // Omit headers that are not used for unary GET requests.
    const header = new Headers(request.header);
    [
        headers_js_1.headerProtocolVersion,
        headers_js_1.headerContentType,
        headers_js_1.headerUnaryContentLength,
        headers_js_1.headerUnaryEncoding,
        headers_js_1.headerUnaryAcceptEncoding,
    ].forEach((h) => header.delete(h));
    return Object.assign(Object.assign({}, request), { init: Object.assign(Object.assign({}, request.init), { method: "GET" }), url,
        header });
}


/***/ }),
/* 104 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.runUnaryCall = runUnaryCall;
exports.runStreamingCall = runStreamingCall;
const interceptor_js_1 = __webpack_require__(82);
const connect_error_js_1 = __webpack_require__(6);
const signals_js_1 = __webpack_require__(68);
const normalize_js_1 = __webpack_require__(81);
/**
 * Runs a unary method with the given interceptors. Note that this function
 * is only used when implementing a Transport.
 */
function runUnaryCall(opt) {
    const next = (0, interceptor_js_1.applyInterceptors)(opt.next, opt.interceptors);
    const [signal, abort, done] = setupSignal(opt);
    const req = Object.assign(Object.assign({}, opt.req), { message: (0, normalize_js_1.normalize)(opt.req.method.I, opt.req.message), signal });
    return next(req).then((res) => {
        done();
        return res;
    }, abort);
}
/**
 * Runs a server-streaming method with the given interceptors. Note that this
 * function is only used when implementing a Transport.
 */
function runStreamingCall(opt) {
    const next = (0, interceptor_js_1.applyInterceptors)(opt.next, opt.interceptors);
    const [signal, abort, done] = setupSignal(opt);
    const req = Object.assign(Object.assign({}, opt.req), { message: (0, normalize_js_1.normalizeIterable)(opt.req.method.I, opt.req.message), signal });
    let doneCalled = false;
    // Call return on the request iterable to indicate
    // that we will no longer consume it and it should
    // cleanup any allocated resources.
    signal.addEventListener("abort", function () {
        var _a, _b;
        const it = opt.req.message[Symbol.asyncIterator]();
        // If the signal is aborted due to an error, we want to throw
        // the error to the request iterator.
        if (!doneCalled) {
            (_a = it.throw) === null || _a === void 0 ? void 0 : _a.call(it, this.reason).catch(() => {
                // throw returns a promise, which we don't care about.
                //
                // Uncaught promises are thrown at sometime/somewhere by the event loop,
                // this is to ensure error is caught and ignored.
            });
        }
        (_b = it.return) === null || _b === void 0 ? void 0 : _b.call(it).catch(() => {
            // return returns a promise, which we don't care about.
            //
            // Uncaught promises are thrown at sometime/somewhere by the event loop,
            // this is to ensure error is caught and ignored.
        });
    });
    return next(req).then((res) => {
        return Object.assign(Object.assign({}, res), { message: {
                [Symbol.asyncIterator]() {
                    const it = res.message[Symbol.asyncIterator]();
                    return {
                        next() {
                            return it.next().then((r) => {
                                if (r.done == true) {
                                    doneCalled = true;
                                    done();
                                }
                                return r;
                            }, abort);
                        },
                        // We deliberately omit throw/return.
                    };
                },
            } });
    }, abort);
}
/**
 * Create an AbortSignal for Transport implementations. The signal is available
 * in UnaryRequest and StreamingRequest, and is triggered when the call is
 * aborted (via a timeout or explicit cancellation), errored (e.g. when reading
 * an error from the server from the wire), or finished successfully.
 *
 * Transport implementations can pass the signal to HTTP clients to ensure that
 * there are no unused connections leak.
 *
 * Returns a tuple:
 * [0]: The signal, which is also aborted if the optional deadline is reached.
 * [1]: Function to call if the Transport encountered an error.
 * [2]: Function to call if the Transport finished without an error.
 */
function setupSignal(opt) {
    const { signal, cleanup } = (0, signals_js_1.createDeadlineSignal)(opt.timeoutMs);
    const controller = (0, signals_js_1.createLinkedAbortController)(opt.signal, signal);
    return [
        controller.signal,
        function abort(reason) {
            // We peek at the deadline signal because fetch() will throw an error on
            // abort that discards the signal reason.
            const e = connect_error_js_1.ConnectError.from(signal.aborted ? (0, signals_js_1.getAbortSignalReason)(signal) : reason);
            controller.abort(e);
            cleanup();
            return Promise.reject(e);
        },
        function done() {
            cleanup();
            controller.abort();
        },
    ];
}


/***/ }),
/* 105 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createUniversalHandlerClient = createUniversalHandlerClient;
const code_js_1 = __webpack_require__(7);
const connect_error_js_1 = __webpack_require__(6);
const async_iterable_js_1 = __webpack_require__(61);
const signals_js_1 = __webpack_require__(68);
/**
 * An in-memory UniversalClientFn that can be used to route requests to a ConnectRouter
 * bypassing network calls. Useful for testing and calling in-process services.
 */
function createUniversalHandlerClient(uHandlers) {
    const handlerMap = new Map();
    for (const handler of uHandlers) {
        handlerMap.set(handler.requestPath, handler);
    }
    return async (uClientReq) => {
        var _a, _b, _c;
        const pathname = new URL(uClientReq.url).pathname;
        const handler = handlerMap.get(pathname);
        if (!handler) {
            throw new connect_error_js_1.ConnectError(`RouterHttpClient: no handler registered for ${pathname}`, code_js_1.Code.Unimplemented);
        }
        const reqSignal = (_a = uClientReq.signal) !== null && _a !== void 0 ? _a : new AbortController().signal;
        const uServerRes = await raceSignal(reqSignal, handler({
            body: (_b = uClientReq.body) !== null && _b !== void 0 ? _b : (0, async_iterable_js_1.createAsyncIterable)([]),
            httpVersion: "2.0",
            method: uClientReq.method,
            url: uClientReq.url,
            header: uClientReq.header,
            signal: reqSignal,
        }));
        const body = (_c = uServerRes.body) !== null && _c !== void 0 ? _c : (0, async_iterable_js_1.createAsyncIterable)([]);
        return {
            body: (0, async_iterable_js_1.pipe)(body, (iterable) => {
                return {
                    [Symbol.asyncIterator]() {
                        const it = iterable[Symbol.asyncIterator]();
                        const w = {
                            next() {
                                return raceSignal(reqSignal, it.next());
                            },
                        };
                        if (it.throw !== undefined) {
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- can't handle mutated object sensibly
                            w.throw = (e) => it.throw(e);
                        }
                        if (it.return !== undefined) {
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-explicit-any -- can't handle mutated object sensibly
                            w.return = (value) => it.return(value);
                        }
                        return w;
                    },
                };
            }),
            header: new Headers(uServerRes.header),
            status: uServerRes.status,
            trailer: new Headers(uServerRes.trailer),
        };
    };
}
/**
 * Wrap a promise, and reject early if the given signal triggers before the
 * promise is settled.
 */
function raceSignal(signal, promise) {
    let cleanup;
    const signalPromise = new Promise((_, reject) => {
        const onAbort = () => reject((0, signals_js_1.getAbortSignalReason)(signal));
        if (signal.aborted) {
            return onAbort();
        }
        signal.addEventListener("abort", onAbort);
        cleanup = () => signal.removeEventListener("abort", onAbort);
    });
    return Promise.race([signalPromise, promise]).finally(cleanup);
}


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/************************************************************************/
/******/
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	var __webpack_export_target__ = exports;
/******/ 	for(var __webpack_i__ in __webpack_exports__) __webpack_export_target__[__webpack_i__] = __webpack_exports__[__webpack_i__];
/******/ 	if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/
/******/ })()
;
//# sourceMappingURL=main.js.map
