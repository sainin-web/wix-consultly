var ConsultantWidget = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // node_modules/@wix/sdk-context/build/browser/index.mjs
  var wixContext;
  var init_browser = __esm({
    "node_modules/@wix/sdk-context/build/browser/index.mjs"() {
      wixContext = {};
    }
  });

  // node_modules/@wix/sdk-types/build/browser/index.mjs
  function EventDefinition(type, isDomainEvent = false, transformations = (x) => x) {
    return () => ({
      __type: "event-definition",
      type,
      isDomainEvent,
      transformations
    });
  }
  var SERVICE_PLUGIN_ERROR_TYPE, SORT_DIRECTIONS, SORT_CAPABILITIES;
  var init_browser2 = __esm({
    "node_modules/@wix/sdk-types/build/browser/index.mjs"() {
      SERVICE_PLUGIN_ERROR_TYPE = "wix_spi_error";
      SORT_DIRECTIONS = {
        ASC: "ASC",
        DESC: "DESC"
      };
      SORT_CAPABILITIES = {
        ...SORT_DIRECTIONS,
        BOTH: "BOTH",
        NONE: "NONE"
      };
    }
  });

  // node_modules/@wix/sdk/build/ambassador-modules.js
  var parseMethod, toHTTPModule, isAmbassadorModule;
  var init_ambassador_modules = __esm({
    "node_modules/@wix/sdk/build/ambassador-modules.js"() {
      parseMethod = (method) => {
        switch (method) {
          case "get":
          case "GET":
            return "GET";
          case "post":
          case "POST":
            return "POST";
          case "put":
          case "PUT":
            return "PUT";
          case "delete":
          case "DELETE":
            return "DELETE";
          case "patch":
          case "PATCH":
            return "PATCH";
          case "head":
          case "HEAD":
            return "HEAD";
          case "options":
          case "OPTIONS":
            return "OPTIONS";
          default:
            throw new Error(`Unknown method: ${method}`);
        }
      };
      toHTTPModule = (factory) => (httpClient) => async (payload) => {
        let requestOptions;
        const HTTPFactory = (context) => {
          requestOptions = factory(payload)(context);
          if (requestOptions.url === void 0) {
            throw new Error("Url was not successfully created for this request, please reach out to support channels for assistance.");
          }
          const { method, url, params } = requestOptions;
          return {
            ...requestOptions,
            method: parseMethod(method),
            url,
            data: requestOptions.data,
            params
          };
        };
        try {
          const response = await httpClient.request(HTTPFactory);
          if (requestOptions === void 0) {
            throw new Error("Request options were not created for this request, please reach out to support channels for assistance.");
          }
          const transformations = Array.isArray(requestOptions.transformResponse) ? requestOptions.transformResponse : [requestOptions.transformResponse];
          let data = response.data;
          transformations.forEach((transform) => {
            if (transform) {
              data = transform(response.data, response.headers);
            }
          });
          return data;
        } catch (e) {
          if (typeof e === "object" && e !== null && "response" in e && typeof e.response === "object" && e.response !== null && "data" in e.response) {
            throw e.response.data;
          }
          throw e;
        }
      };
      isAmbassadorModule = (module) => {
        if (module.__isAmbassador) {
          return true;
        }
        const fn = module();
        return Boolean(fn.__isAmbassador);
      };
    }
  });

  // node_modules/@wix/sdk/build/common.js
  var PUBLIC_METADATA_KEY, DEFAULT_API_URL, DEFAULT_EDGE_API_URL;
  var init_common = __esm({
    "node_modules/@wix/sdk/build/common.js"() {
      PUBLIC_METADATA_KEY = "__metadata";
      DEFAULT_API_URL = "www.wixapis.com";
      DEFAULT_EDGE_API_URL = "edge.wixapis.com";
    }
  });

  // node_modules/@wix/sdk/build/fetch-error.js
  var FetchErrorResponse, errorBuilder;
  var init_fetch_error = __esm({
    "node_modules/@wix/sdk/build/fetch-error.js"() {
      FetchErrorResponse = class extends Error {
        constructor(message, response) {
          super(message);
          __publicField(this, "message");
          __publicField(this, "response");
          this.message = message;
          this.response = response;
        }
        async details() {
          const dataError = await this.response.json();
          return errorBuilder(this.response.status, dataError?.message, dataError?.details, {
            requestId: this.response.headers.get("X-Wix-Request-Id"),
            details: dataError
          });
        }
      };
      errorBuilder = (code, description, details, data) => {
        return {
          details: {
            ...!details?.validationError && {
              applicationError: {
                description,
                code,
                data
              }
            },
            ...details
          },
          message: description,
          requestId: data?.requestId
        };
      };
    }
  });

  // node_modules/@wix/sdk/build/helpers.js
  var getDefaultContentHeader, isObject;
  var init_helpers = __esm({
    "node_modules/@wix/sdk/build/helpers.js"() {
      getDefaultContentHeader = (options) => {
        if (options?.method && ["post", "put", "patch"].includes(options.method.toLocaleLowerCase()) && options.body) {
          return { "Content-Type": "application/json" };
        }
        return {};
      };
      isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
    }
  });

  // node_modules/@wix/sdk/build/host-modules.js
  function buildHostModule(val, host) {
    return val.create(host);
  }
  var isHostModule;
  var init_host_modules = __esm({
    "node_modules/@wix/sdk/build/host-modules.js"() {
      isHostModule = (val) => val.__type === "host";
    }
  });

  // node_modules/@wix/sdk/build/bi/biHeaderGenerator.js
  function biHeaderGenerator(apiMetadata, publicMetadata, environment) {
    return {
      [WixBIHeaderName]: objectToKeyValue({
        environment: `js-sdk${environment ? `-${environment}` : ``}`,
        "package-name": apiMetadata.packageName ?? publicMetadata?.PACKAGE_NAME,
        "method-fqn": apiMetadata.methodFqn,
        entity: apiMetadata.entityFqdn
      })
    };
  }
  function objectToKeyValue(input) {
    return Object.entries(input).filter(([_, value]) => Boolean(value)).map(([key, value]) => `${key}=${value}`).join(",");
  }
  var WixBIHeaderName;
  var init_biHeaderGenerator = __esm({
    "node_modules/@wix/sdk/build/bi/biHeaderGenerator.js"() {
      WixBIHeaderName = "x-wix-bi-gateway";
    }
  });

  // node_modules/@wix/sdk-runtime/build/context-v2.js
  function contextualizeEventDefinitionModuleV2(eventDefinition) {
    const contextualMethod = ((...args) => {
      const context = resolveContext();
      if (!context) {
        return () => {
          return {
            slug: eventDefinition.type
          };
        };
      }
      return context.initWixModules(eventDefinition).apply(void 0, args);
    });
    contextualMethod.__type = eventDefinition.__type;
    contextualMethod.type = eventDefinition.type;
    contextualMethod.isDomainEvent = eventDefinition.isDomainEvent;
    contextualMethod.transformations = eventDefinition.transformations;
    return contextualMethod;
  }
  var init_context_v2 = __esm({
    "node_modules/@wix/sdk-runtime/build/context-v2.js"() {
      init_context();
    }
  });

  // node_modules/@wix/sdk-runtime/build/context.js
  function resolveContext() {
    const oldContext = typeof $wixContext !== "undefined" && $wixContext.initWixModules ? $wixContext.initWixModules : typeof globalThis.__wix_context__ !== "undefined" && globalThis.__wix_context__.initWixModules ? globalThis.__wix_context__.initWixModules : void 0;
    if (oldContext) {
      return {
        // @ts-expect-error
        initWixModules(modules, elevated) {
          return runWithoutContext(() => oldContext(modules, elevated));
        },
        fetchWithAuth() {
          throw new Error("fetchWithAuth is not available in this context");
        },
        graphql() {
          throw new Error("graphql is not available in this context");
        }
      };
    }
    const contextualClient = typeof $wixContext !== "undefined" ? $wixContext.client : typeof wixContext.client !== "undefined" ? wixContext.client : typeof globalThis.__wix_context__ !== "undefined" ? globalThis.__wix_context__.client : void 0;
    const elevatedClient = typeof $wixContext !== "undefined" ? $wixContext.elevatedClient : typeof wixContext.elevatedClient !== "undefined" ? wixContext.elevatedClient : typeof globalThis.__wix_context__ !== "undefined" ? globalThis.__wix_context__.elevatedClient : void 0;
    if (!contextualClient && !elevatedClient) {
      return;
    }
    return {
      initWixModules(wixModules, elevated) {
        if (elevated) {
          if (!elevatedClient) {
            throw new Error("An elevated client is required to use elevated modules. Make sure to initialize the Wix context with an elevated client before using elevated SDK modules");
          }
          return runWithoutContext(() => elevatedClient.use(wixModules));
        }
        if (!contextualClient) {
          throw new Error("Wix context is not available. Make sure to initialize the Wix context before using SDK modules");
        }
        return runWithoutContext(() => contextualClient.use(wixModules));
      },
      fetchWithAuth: (urlOrRequest, requestInit) => {
        if (!contextualClient) {
          throw new Error("Wix context is not available. Make sure to initialize the Wix context before using SDK modules");
        }
        return contextualClient.fetchWithAuth(urlOrRequest, requestInit);
      },
      getAuth() {
        if (!contextualClient) {
          throw new Error("Wix context is not available. Make sure to initialize the Wix context before using SDK modules");
        }
        return contextualClient.auth;
      },
      async graphql(query, variables, opts) {
        if (!contextualClient) {
          throw new Error("Wix context is not available. Make sure to initialize the Wix context before using SDK modules");
        }
        return contextualClient.graphql(query, variables, opts);
      }
    };
  }
  function runWithoutContext(fn) {
    const globalContext = globalThis.__wix_context__;
    const moduleContext = {
      client: wixContext.client,
      elevatedClient: wixContext.elevatedClient
    };
    let closureContext;
    globalThis.__wix_context__ = void 0;
    wixContext.client = void 0;
    wixContext.elevatedClient = void 0;
    if (typeof $wixContext !== "undefined") {
      closureContext = {
        client: $wixContext?.client,
        elevatedClient: $wixContext?.elevatedClient
      };
      delete $wixContext.client;
      delete $wixContext.elevatedClient;
    }
    try {
      return fn();
    } finally {
      globalThis.__wix_context__ = globalContext;
      wixContext.client = moduleContext.client;
      wixContext.elevatedClient = moduleContext.elevatedClient;
      if (typeof $wixContext !== "undefined") {
        $wixContext.client = closureContext.client;
        $wixContext.elevatedClient = closureContext.elevatedClient;
      }
    }
  }
  var init_context = __esm({
    "node_modules/@wix/sdk-runtime/build/context.js"() {
      init_browser();
      init_context_v2();
    }
  });

  // node_modules/@wix/sdk-runtime/build/constants.js
  var RESTResponseToSDKResponseRenameMap;
  var init_constants = __esm({
    "node_modules/@wix/sdk-runtime/build/constants.js"() {
      RESTResponseToSDKResponseRenameMap = {
        id: "_id",
        createdDate: "_createdDate",
        updatedDate: "_updatedDate"
      };
    }
  });

  // node_modules/@wix/sdk-runtime/build/utils.js
  function constantCase(input) {
    return split(input).map((part) => part.toLocaleUpperCase()).join("_");
  }
  function split(value) {
    let result = value.trim();
    result = result.replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE).replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE);
    result = result.replace(DEFAULT_STRIP_REGEXP, "\0");
    let start = 0;
    let end = result.length;
    while (result.charAt(start) === "\0") {
      start++;
    }
    if (start === end) {
      return [];
    }
    while (result.charAt(end - 1) === "\0") {
      end--;
    }
    return result.slice(start, end).split(/\0/g);
  }
  var SPLIT_LOWER_UPPER_RE, SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE, DEFAULT_STRIP_REGEXP;
  var init_utils = __esm({
    "node_modules/@wix/sdk-runtime/build/utils.js"() {
      SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu;
      SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;
      SPLIT_REPLACE_VALUE = "$1\0$2";
      DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu;
    }
  });

  // node_modules/@wix/sdk-runtime/build/transform-error.js
  function transformError(httpClientError, pathsToArguments = {
    explicitPathsToArguments: {},
    spreadPathsToArguments: {},
    singleArgumentUnchanged: false
  }, argumentNames = []) {
    if (typeof httpClientError !== "object" || httpClientError === null) {
      throw httpClientError;
    }
    if (isValidationError(httpClientError)) {
      return buildValidationError(httpClientError, pathsToArguments, argumentNames);
    }
    if (isApplicationError(httpClientError)) {
      return buildApplicationError(httpClientError);
    }
    if (isClientError(httpClientError)) {
      const status = httpClientError.response?.status;
      const statusText = httpClientError.response?.statusText ?? "UNKNOWN";
      const message = httpClientError.response?.data?.message ?? statusText;
      const details = {
        applicationError: {
          description: statusText,
          code: constantCase(statusText),
          data: {}
        },
        requestId: httpClientError.requestId
      };
      return wrapError(httpClientError, {
        message: JSON.stringify({
          message,
          details
        }, null, 2),
        extraProperties: {
          details,
          status
        }
      });
    }
    return buildSystemError(httpClientError);
  }
  var isValidationError, isApplicationError, isClientError, buildValidationError, wrapError, buildApplicationError, buildSystemError, violationsWithRenamedFields, withRenamedArgument, getArgumentIndex;
  var init_transform_error = __esm({
    "node_modules/@wix/sdk-runtime/build/transform-error.js"() {
      init_utils();
      isValidationError = (httpClientError) => "validationError" in (httpClientError.response?.data?.details ?? {});
      isApplicationError = (httpClientError) => "applicationError" in (httpClientError.response?.data?.details ?? {});
      isClientError = (httpClientError) => (httpClientError.response?.status ?? -1) >= 400 && (httpClientError.response?.status ?? -1) < 500;
      buildValidationError = (httpClientError, pathsToArguments, argumentNames) => {
        const validationErrorResponse = httpClientError.response?.data;
        const requestId = httpClientError.requestId;
        const { fieldViolations } = validationErrorResponse.details.validationError;
        const transformedFieldViolations = violationsWithRenamedFields(pathsToArguments, fieldViolations, argumentNames)?.sort((a, b) => a.field < b.field ? -1 : 1);
        const message = `INVALID_ARGUMENT: ${transformedFieldViolations?.map(({ field, description }) => `"${field}" ${description}`)?.join(", ")}`;
        const details = {
          validationError: { fieldViolations: transformedFieldViolations },
          requestId
        };
        return wrapError(httpClientError, {
          message: JSON.stringify({ message, details }, null, 2),
          extraProperties: {
            details,
            status: httpClientError.response?.status,
            requestId
          }
        });
      };
      wrapError = (baseError, { message, extraProperties }) => {
        return Object.assign(baseError, {
          ...extraProperties,
          message
        });
      };
      buildApplicationError = (httpClientError) => {
        const status = httpClientError.response?.status;
        const statusText = httpClientError.response?.statusText ?? "UNKNOWN";
        const message = httpClientError.response?.data?.message ?? statusText;
        const description = httpClientError.response?.data?.details?.applicationError?.description ?? statusText;
        const code = httpClientError.response?.data?.details?.applicationError?.code ?? constantCase(statusText);
        const data = httpClientError.response?.data?.details?.applicationError?.data ?? {};
        const combinedMessage = message === description ? message : `${message}: ${description}`;
        const details = {
          applicationError: {
            description,
            code,
            data
          },
          requestId: httpClientError.requestId
        };
        return wrapError(httpClientError, {
          message: JSON.stringify({ message: combinedMessage, details }, null, 2),
          extraProperties: {
            details,
            status,
            requestId: httpClientError.requestId
          }
        });
      };
      buildSystemError = (httpClientError) => {
        const message = httpClientError.requestId ? `System error occurred, request-id: ${httpClientError.requestId}` : `System error occurred: ${JSON.stringify(httpClientError)}`;
        return wrapError(httpClientError, {
          message,
          extraProperties: {
            requestId: httpClientError.requestId,
            status: httpClientError.response?.status,
            code: constantCase(httpClientError.response?.statusText ?? "UNKNOWN"),
            ...!httpClientError.response && {
              runtimeError: httpClientError
            }
          }
        });
      };
      violationsWithRenamedFields = ({ spreadPathsToArguments, explicitPathsToArguments, singleArgumentUnchanged }, fieldViolations, argumentNames) => {
        const allPathsToArguments = {
          ...spreadPathsToArguments,
          ...explicitPathsToArguments
        };
        const allPathsToArgumentsKeys = Object.keys(allPathsToArguments);
        return fieldViolations?.filter((fieldViolation) => {
          const containedInAMoreSpecificViolationField = fieldViolations.some((anotherViolation) => anotherViolation.field.length > fieldViolation.field.length && anotherViolation.field.startsWith(fieldViolation.field) && allPathsToArgumentsKeys.includes(anotherViolation.field));
          return !containedInAMoreSpecificViolationField;
        }).map((fieldViolation) => {
          const exactMatchArgumentExpression = explicitPathsToArguments[fieldViolation.field];
          if (exactMatchArgumentExpression) {
            return {
              ...fieldViolation,
              field: withRenamedArgument(exactMatchArgumentExpression, argumentNames)
            };
          }
          const longestPartialPathMatch = allPathsToArgumentsKeys?.sort((a, b) => b.length - a.length)?.find((path) => fieldViolation.field.startsWith(path));
          if (longestPartialPathMatch) {
            const partialMatchArgumentExpression = allPathsToArguments[longestPartialPathMatch];
            if (partialMatchArgumentExpression) {
              return {
                ...fieldViolation,
                field: fieldViolation.field.replace(longestPartialPathMatch, withRenamedArgument(partialMatchArgumentExpression, argumentNames))
              };
            }
          }
          if (singleArgumentUnchanged) {
            return {
              ...fieldViolation,
              field: `${argumentNames[0]}.${fieldViolation.field}`
            };
          }
          return fieldViolation;
        });
      };
      withRenamedArgument = (fieldValue, argumentNames) => {
        const argIndex = getArgumentIndex(fieldValue);
        if (argIndex !== null && typeof argIndex !== "undefined") {
          return fieldValue.replace(`$[${argIndex}]`, argumentNames[argIndex]);
        }
        return fieldValue;
      };
      getArgumentIndex = (s) => {
        const match = s.match(/\$\[(?<argIndex>\d+)\]/);
        return match && match.groups && Number(match.groups.argIndex);
      };
    }
  });

  // node_modules/@wix/sdk/build/rest-modules.js
  function buildRESTDescriptor(origFunc, publicMetadata, boundFetch, errorHandler, wixAPIFetch, getActiveToken, getAuthHeaders, options, hostName, useCDN, validateRequestSchema) {
    return runWithoutContext(() => origFunc({
      request: async (factory) => {
        const requestOptions = factory({
          host: options?.HTTPHost || DEFAULT_API_URL
        });
        let request = requestOptions;
        if (request.method === "GET" && request.fallback?.length && (request.params?.toString().length ?? 0) > 4e3) {
          request = requestOptions.fallback[0];
        }
        const domain = options?.HTTPHost ?? DEFAULT_API_URL;
        let url = `https://${useCDN ? DEFAULT_EDGE_API_URL : domain}${request.url}`;
        if (request.params && request.params.toString()) {
          url += `?${request.params.toString()}`;
        }
        try {
          const biHeader = biHeaderGenerator(requestOptions, publicMetadata, hostName);
          const requestOptionsInit = {
            method: request.method,
            ...request.data && {
              body: JSON.stringify(request.data)
            },
            headers: {
              ...biHeader
            }
          };
          const res = await boundFetch(url, requestOptionsInit);
          if (res.status !== 200) {
            let dataError = null;
            try {
              dataError = await res.json();
            } catch (e) {
            }
            const error = errorBuilder2(res.status, dataError?.message, dataError?.details, {
              requestId: res.headers.get("X-Wix-Request-Id"),
              details: dataError
            });
            const transformedError = transformError(error);
            errorHandler?.handleError(transformedError, {
              requestOptions: {
                url: request.url,
                method: request.method,
                entityFqdn: requestOptions.entityFqdn,
                methodFqn: requestOptions.methodFqn
              }
            });
            throw error;
          }
          const rawData = await res.json();
          const data = (
            // we only transform the response if the optInTransformResponse flag is set
            // this is for backwards compatibility as some users might rely on not transforming the response
            // in older modules. In that case the modules would not have the optInTransformResponse flag set
            request.migrationOptions?.optInTransformResponse && request.transformResponse ? Array.isArray(request.transformResponse) ? request.transformResponse[0](rawData) : request.transformResponse(rawData) : rawData
          );
          return {
            data,
            headers: res.headers,
            status: res.status,
            statusText: res.statusText
          };
        } catch (e) {
          if (e.message?.includes("fetch is not defined")) {
            console.error("Node.js v18+ is required");
          }
          throw e;
        }
      },
      fetchWithAuth: boundFetch,
      wixAPIFetch,
      getActiveToken,
      getAuthHeaders
    }, { validateRequestSchema }));
  }
  var SDKError, errorBuilder2;
  var init_rest_modules = __esm({
    "node_modules/@wix/sdk/build/rest-modules.js"() {
      init_biHeaderGenerator();
      init_common();
      init_context();
      init_transform_error();
      SDKError = class extends Error {
        constructor(params) {
          super();
          __publicField(this, "response");
          __publicField(this, "requestId");
          this.response = params.response;
          this.requestId = params.requestId;
        }
      };
      errorBuilder2 = (code, description, details, data) => {
        return new SDKError({
          response: {
            data: {
              details: {
                ...!details?.validationError && {
                  applicationError: {
                    description,
                    code,
                    data
                  }
                },
                ...details
              },
              message: description
            },
            status: code
          },
          requestId: data?.requestId
        });
      };
    }
  });

  // node_modules/@wix/sdk-runtime/build/rest-modules.js
  var DOMAINS, REGEX_CAPTURE_DOMAINS, WIX_API_DOMAINS, DEV_WIX_CODE_DOMAIN, REGEX_CAPTURE_API_DOMAINS, REGEX_CAPTURE_DEV_WIX_CODE_DOMAIN;
  var init_rest_modules2 = __esm({
    "node_modules/@wix/sdk-runtime/build/rest-modules.js"() {
      init_constants();
      DOMAINS = ["wix.com", "editorx.com"];
      REGEX_CAPTURE_DOMAINS = new RegExp(`\\.(${DOMAINS.join("|")})$`);
      WIX_API_DOMAINS = ["42.wixprod.net", "uw2-edt-1.wixprod.net"];
      DEV_WIX_CODE_DOMAIN = "dev.wix-code.com";
      REGEX_CAPTURE_API_DOMAINS = new RegExp(`\\.(${WIX_API_DOMAINS.join("|")})$`);
      REGEX_CAPTURE_DEV_WIX_CODE_DOMAIN = new RegExp(`.*\\.${DEV_WIX_CODE_DOMAIN}$`);
    }
  });

  // node_modules/@wix/sdk/build/object-utils.js
  function set(obj, path, value) {
    if (obj == null) {
      throw new Error("Cannot set value on null or undefined");
    }
    const keys = toPathObject(path);
    let current = obj;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (i === keys.length - 1) {
        current[key] = value;
        break;
      }
      const nextKey = keys[i + 1];
      if (!(key in current) || current[key] == null) {
        current[key] = typeof nextKey === "number" ? [] : {};
      } else if (typeof current[key] !== "object" || current[key] === null) {
        current[key] = typeof nextKey === "number" ? [] : {};
      }
      current = current[key];
    }
    return obj;
  }
  function toPathObject(path) {
    if (Array.isArray(path)) {
      return path;
    }
    return path.split(DELIMITER).map((segment) => isNumericSegment(segment) ? Number(segment) : segment);
  }
  function isNumericSegment(segment) {
    return /^\d+$/.test(segment);
  }
  var DELIMITER;
  var init_object_utils = __esm({
    "node_modules/@wix/sdk/build/object-utils.js"() {
      DELIMITER = ".";
    }
  });

  // node_modules/@wix/sdk/build/flat-utils.js
  function unflatten(flatObject) {
    const result = {};
    for (const [flatKey, value] of Object.entries(flatObject)) {
      if (isPrototypePollutionKey(flatKey)) {
        continue;
      }
      const path = toPathObject(flatKey);
      set(result, path, value);
    }
    return result;
  }
  function isPrototypePollutionKey(key) {
    return key === "__proto__" || key === "constructor" || key === "prototype";
  }
  var init_flat_utils = __esm({
    "node_modules/@wix/sdk/build/flat-utils.js"() {
      init_object_utils();
    }
  });

  // node_modules/@wix/sdk/build/modified-fields-manipulator.js
  function attemptTransformationWithModifiedFields(envelope, transformFromRESTFn) {
    const modifiedFields = envelope?.modifiedFields;
    if (!modifiedFields) {
      return null;
    }
    const unflattenedResult = attemptUnflatten(modifiedFields);
    if (!unflattenedResult) {
      return null;
    }
    const { unflattenedModifiedFields, modifiedFieldsManipulator } = unflattenedResult;
    envelope = {
      ...envelope,
      modifiedFields: unflattenedModifiedFields
    };
    const transformedEnvelope = transformFromRESTFn(envelope);
    const transformedModifiedFields = transformedEnvelope?.modifiedFields;
    if (!transformedModifiedFields) {
      return null;
    }
    const flattened = attemptFlatten(transformedModifiedFields, modifiedFieldsManipulator);
    if (flattened !== null) {
      transformedEnvelope.modifiedFields = flattened;
      return transformedEnvelope;
    }
    return null;
  }
  function attemptUnflatten(modifiedFields) {
    if (typeof modifiedFields === "object" && modifiedFields !== null && !Array.isArray(modifiedFields)) {
      try {
        const modifiedFieldsManipulator = new ModifiedFieldsManipulator(modifiedFields);
        const unflattened = modifiedFieldsManipulator.unflatten();
        return {
          unflattenedModifiedFields: unflattened,
          modifiedFieldsManipulator
        };
      } catch (error) {
        return null;
      }
    }
    return null;
  }
  function attemptFlatten(transformedModifiedFields, modifiedFieldsManipulator) {
    if (typeof transformedModifiedFields === "object" && transformedModifiedFields !== null && !Array.isArray(transformedModifiedFields)) {
      try {
        const flattened = modifiedFieldsManipulator.flatten(transformedModifiedFields);
        return flattened;
      } catch (error) {
        return null;
      }
    }
    return null;
  }
  function camelCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : "").replace(/^./, (c) => c.toLowerCase());
  }
  var ModifiedFieldsManipulator;
  var init_modified_fields_manipulator = __esm({
    "node_modules/@wix/sdk/build/modified-fields-manipulator.js"() {
      init_rest_modules2();
      init_flat_utils();
      ModifiedFieldsManipulator = class {
        constructor(modifiedFields) {
          __publicField(this, "BRACKET_PATTERN", /\[(\d+)\]/g);
          __publicField(this, "NUMERIC_PATTERN", /^\d+$/);
          __publicField(this, "ESCAPED_DOT_PATTERN", /\\\./g);
          __publicField(this, "ESCAPED_LEFT_BRACKET_PATTERN", /\\\[/g);
          __publicField(this, "ESCAPED_RIGHT_BRACKET_PATTERN", /\\\]/g);
          __publicField(this, "SPLIT_PATTERN", /\.|\[(\d+)\]/g);
          __publicField(this, "DOT_BEFORE_BRACKET_PATTERN", /\.\[/g);
          __publicField(this, "ESCAPED_DOT_PLACEHOLDER", "__DOT__");
          __publicField(this, "ESCAPED_RIGHT_BRACKET_PLACEHOLDER", "__RB__");
          __publicField(this, "ESCAPED_LEFT_BRACKET_PLACEHOLDER", "__LB__");
          __publicField(this, "modifiedFields");
          __publicField(this, "cleanedModifiedFields");
          this.modifiedFields = modifiedFields;
        }
        replaceEscapedCharacters(key) {
          return key.replace(this.ESCAPED_DOT_PATTERN, this.ESCAPED_DOT_PLACEHOLDER).replace(this.ESCAPED_LEFT_BRACKET_PATTERN, this.ESCAPED_LEFT_BRACKET_PLACEHOLDER).replace(this.ESCAPED_RIGHT_BRACKET_PATTERN, this.ESCAPED_RIGHT_BRACKET_PLACEHOLDER);
        }
        restoreEscapedCharacters(key) {
          return key.replace(this.ESCAPED_DOT_PLACEHOLDER, "\\.").replace(this.ESCAPED_RIGHT_BRACKET_PLACEHOLDER, "\\]").replace(this.ESCAPED_LEFT_BRACKET_PLACEHOLDER, "\\[");
        }
        unflatten() {
          this.cleanedModifiedFields = Object.fromEntries(Object.entries(this.modifiedFields).map(([key, value]) => [
            this.replaceEscapedCharacters(this.bracketToDotNotation(key)),
            value
          ]));
          return unflatten(this.cleanedModifiedFields);
        }
        flatten(transformedModifiedFields) {
          let result = {};
          for (const originalKey of Object.keys(this.cleanedModifiedFields)) {
            const pathParts = this.splitPath(originalKey);
            const value = this.navigatePath(transformedModifiedFields, pathParts);
            result = { ...result, ...value };
          }
          return Object.fromEntries(Object.entries(result).map(([key, value]) => [
            this.restoreEscapedCharacters(key),
            value
          ]));
        }
        splitPath(path) {
          const parts = [];
          let lastIndex = 0;
          const matches = Array.from(path.matchAll(this.SPLIT_PATTERN));
          for (const match of matches) {
            if (match.index > lastIndex) {
              parts.push(path.substring(lastIndex, match.index));
            }
            if (match[1]) {
              parts.push(match[1]);
            }
            lastIndex = match.index + match[0].length;
          }
          if (lastIndex < path.length) {
            parts.push(path.substring(lastIndex));
          }
          return parts;
        }
        navigatePath(obj, pathParts) {
          let current = obj;
          const transformedPath = [];
          const handleArray = (part) => {
            if (!Array.isArray(current)) {
              throw new Error(`Expected array at path ${this.buildPathString(transformedPath)}, but got ${typeof current}`);
            }
            transformedPath.push(`[${part}]`);
            current = current[parseInt(part, 10)];
          };
          const handleTransformedKeyName = (part, currentObj) => {
            const transformedKey = part in RESTResponseToSDKResponseRenameMap ? RESTResponseToSDKResponseRenameMap[part] : void 0;
            if (transformedKey && transformedKey in currentObj) {
              transformedPath.push(transformedKey);
              current = currentObj[transformedKey];
              return;
            }
            const camelCaseKey = camelCase(part);
            if (camelCaseKey && camelCaseKey in currentObj) {
              transformedPath.push(camelCaseKey);
              current = currentObj[camelCaseKey];
              return;
            }
            throw new Error(`Cannot find key '${part}' or its transformations at path ${this.buildPathString(transformedPath)}`);
          };
          const handleObject = (part, currentObj) => {
            transformedPath.push(part);
            current = currentObj[part];
            return;
          };
          for (const part of pathParts) {
            if (this.NUMERIC_PATTERN.test(part)) {
              handleArray(part);
              continue;
            }
            if (current === null || typeof current !== "object") {
              throw new Error(`Cannot access property '${part}' on ${typeof current} at path ${this.buildPathString(transformedPath)}`);
            }
            const currentObj = current;
            if (part in current) {
              handleObject(part, currentObj);
              continue;
            }
            handleTransformedKeyName(part, currentObj);
          }
          return { [this.buildPathString(transformedPath)]: current };
        }
        buildPathString(pathParts) {
          return pathParts.join(".").replace(this.DOT_BEFORE_BRACKET_PATTERN, "[");
        }
        bracketToDotNotation(key) {
          return key.replace(this.BRACKET_PATTERN, (match, number, offset) => {
            if (offset > 0 && key[offset - 1] === "\\") {
              return match;
            }
            return "." + number;
          });
        }
      };
    }
  });

  // node_modules/@wix/sdk-runtime/build/nanoevents.js
  function createNanoEvents() {
    return {
      emit(event, ...args) {
        for (let i = 0, callbacks = this.events[event] || [], length = callbacks.length; i < length; i++) {
          callbacks[i](...args);
        }
      },
      events: {},
      on(event, cb) {
        var _a;
        ((_a = this.events)[event] || (_a[event] = [])).push(cb);
        return () => {
          this.events[event] = this.events[event]?.filter((i) => cb !== i);
        };
      }
    };
  }
  var init_nanoevents = __esm({
    "node_modules/@wix/sdk-runtime/build/nanoevents.js"() {
    }
  });

  // node_modules/@wix/sdk/build/nanoevents.js
  var init_nanoevents2 = __esm({
    "node_modules/@wix/sdk/build/nanoevents.js"() {
      init_nanoevents();
    }
  });

  // node_modules/@wix/sdk/build/event-handlers-modules.js
  function runHandler(eventDefinition, handler, payload, baseEventMetadata) {
    let envelope;
    if (eventDefinition.isDomainEvent) {
      const domainEventPayload = payload;
      const { deletedEvent, actionEvent, createdEvent, updatedEvent, ...domainEventMetadata } = domainEventPayload;
      const metadata = {
        ...baseEventMetadata,
        ...domainEventMetadata
      };
      if (deletedEvent) {
        if (deletedEvent?.deletedEntity) {
          envelope = {
            entity: deletedEvent?.deletedEntity,
            metadata
          };
        } else {
          envelope = { metadata };
        }
      } else if (actionEvent) {
        envelope = {
          data: actionEvent.body,
          metadata
        };
      } else if (updatedEvent) {
        envelope = {
          entity: updatedEvent.currentEntity,
          metadata,
          ...updatedEvent.modifiedFields ? { modifiedFields: updatedEvent.modifiedFields } : {}
        };
      } else {
        envelope = {
          entity: createdEvent?.entity,
          metadata
        };
      }
    } else {
      envelope = {
        data: payload,
        metadata: baseEventMetadata
      };
    }
    const transformFromRESTFn = eventDefinition.transformations ?? ((x) => x);
    let originalEnvelope = envelope;
    const envelopeAny = envelope;
    if (envelopeAny.modifiedFields) {
      const modifiedFieldsValue = envelopeAny.modifiedFields;
      if (typeof modifiedFieldsValue === "object" && modifiedFieldsValue !== null && !Array.isArray(modifiedFieldsValue)) {
        originalEnvelope = structuredClone(envelope);
        const transformedEnvelope = attemptTransformationWithModifiedFields(envelopeAny, transformFromRESTFn);
        if (transformedEnvelope) {
          return handler(transformedEnvelope);
        }
      }
    }
    return handler(transformFromRESTFn(originalEnvelope));
  }
  function eventHandlersModules(getAuthStrategy) {
    const eventHandlers = /* @__PURE__ */ new Map();
    const webhooksEmitter = createNanoEvents();
    const client = {
      ...webhooksEmitter,
      getRegisteredEvents: () => eventHandlers,
      async process(jwt, opts = {
        expectedEvents: []
      }) {
        const { eventType, identity, instanceId, payload, accountInfo } = await this.parseJWT(jwt);
        const allExpectedEvents = [
          ...opts.expectedEvents,
          ...Array.from(eventHandlers.keys()).map((type) => ({ type }))
        ];
        if (allExpectedEvents.length > 0 && !allExpectedEvents.some(({ type }) => type === eventType)) {
          throw new Error(`Unexpected event type: ${eventType}. Expected one of: ${allExpectedEvents.map((x) => x.type).join(", ")}`);
        }
        const handlers = eventHandlers.get(eventType) ?? [];
        await Promise.all(handlers.map(({ eventDefinition, handler }) => runHandler(eventDefinition, handler, payload, {
          instanceId,
          identity,
          accountInfo
        })));
        return {
          instanceId,
          eventType,
          payload,
          identity,
          accountInfo
        };
      },
      async processRequest(request, opts) {
        const body = await request.text();
        return this.process(body, opts);
      },
      async parseJWT(jwt) {
        const authStrategy = getAuthStrategy();
        if (!authStrategy.decodeJWT) {
          throw new Error("decodeJWT is not supported by the authentication strategy");
        }
        const { decoded, valid } = await authStrategy.decodeJWT(jwt);
        if (!valid) {
          throw new Error("JWT is not valid");
        }
        if (typeof decoded.data !== "string") {
          throw new Error(`Unexpected type of JWT data: expected string, got ${typeof decoded.data}`);
        }
        const parsedDecoded = JSON.parse(decoded.data);
        const eventType = parsedDecoded.eventType;
        const accountInfo = parsedDecoded.accountInfo;
        const instanceId = parsedDecoded.instanceId;
        const identity = parsedDecoded.identity ? JSON.parse(parsedDecoded.identity) : void 0;
        const payload = JSON.parse(parsedDecoded.data);
        return {
          instanceId,
          eventType,
          payload,
          identity,
          accountInfo
        };
      },
      async parseRequest(request) {
        const jwt = await request.text();
        return this.parseJWT(jwt);
      },
      async executeHandlers(event) {
        const allExpectedEvents = Array.from(eventHandlers.keys()).map((type) => ({ type }));
        if (allExpectedEvents.length > 0 && !allExpectedEvents.some(({ type }) => type === event.eventType)) {
          throw new Error(`Unexpected event type: ${event.eventType}. Expected one of: ${allExpectedEvents.map((x) => x.type).join(", ")}`);
        }
        const handlers = eventHandlers.get(event.eventType) ?? [];
        await Promise.all(handlers.map(({ eventDefinition, handler }) => runHandler(eventDefinition, handler, event.payload, {
          instanceId: event.instanceId,
          identity: event.identity
        })));
      },
      apps: {
        AppInstalled: EventDefinition("AppInstalled")(),
        AppRemoved: EventDefinition("AppRemoved")()
      }
    };
    return {
      initModule(eventDefinition) {
        return (handler) => {
          const handlers = eventHandlers.get(eventDefinition.type) ?? [];
          handlers.push({ eventDefinition, handler });
          eventHandlers.set(eventDefinition.type, handlers);
          webhooksEmitter.emit("registered", eventDefinition);
        };
      },
      client
    };
  }
  var isEventHandlerModule;
  var init_event_handlers_modules = __esm({
    "node_modules/@wix/sdk/build/event-handlers-modules.js"() {
      init_browser2();
      init_modified_fields_manipulator();
      init_nanoevents2();
      isEventHandlerModule = (val) => val.__type === "event-definition";
    }
  });

  // node_modules/@wix/sdk/build/service-plugin-modules.js
  function servicePluginsModules(getAuthStrategy) {
    const servicePluginsImplementations = /* @__PURE__ */ new Map();
    const servicePluginsEmitter = createNanoEvents();
    const client = {
      ...servicePluginsEmitter,
      getRegisteredServicePlugins: () => servicePluginsImplementations,
      async parseJWT(jwt) {
        const authStrategy = getAuthStrategy();
        if (!authStrategy.decodeJWT) {
          throw new Error("decodeJWT is not supported by the authentication strategy");
        }
        const { decoded, valid } = await authStrategy.decodeJWT(jwt, true);
        if (!valid) {
          throw new Error("JWT is not valid");
        }
        if (typeof decoded.data !== "object" || decoded.data === null || !("metadata" in decoded.data) || typeof decoded.data.metadata !== "object" || decoded.data.metadata === null || !("appExtensionType" in decoded.data.metadata) || typeof decoded.data.metadata.appExtensionType !== "string") {
          throw new Error("Unexpected JWT data: expected object with metadata.appExtensionType string");
        }
        return decoded.data;
      },
      async process(request) {
        const servicePluginRequest = await this.parseJWT(request.body);
        return this.executeHandler(servicePluginRequest, request.url);
      },
      async parseRequest(request) {
        const body = await request.text();
        return this.parseJWT(body);
      },
      async processRequest(request) {
        const url = request.url;
        const body = await request.text();
        try {
          const implMethodResult = await this.process({ url, body });
          return Response.json(implMethodResult);
        } catch (err) {
          if (err.errorType === "SPI" && err.applicationCode && err.httpCode) {
            return Response.json({ applicationError: { code: err.applicationCode, data: err.data } }, { status: err.httpCode });
          }
          throw err;
        }
      },
      async executeHandler(servicePluginRequest, url) {
        const componentType = servicePluginRequest.metadata.appExtensionType.toLowerCase();
        const implementations = servicePluginsImplementations.get(componentType) ?? [];
        if (implementations.length === 0) {
          throw new Error(`No service plugin implementations found for component type ${componentType}`);
        } else if (implementations.length > 1) {
          throw new Error(`Multiple service plugin implementations found for component type ${componentType}. This is currently not supported`);
        }
        const { implementation: impl, servicePluginDefinition } = implementations[0];
        const method = servicePluginDefinition.methods.find((m) => url.endsWith(m.primaryHttpMappingPath));
        if (!method) {
          throw new Error("Unexpect request: request url did not match any method: " + url);
        }
        const implMethod = impl[method.name];
        if (!implMethod) {
          throw new Error(`Got request for service plugin method ${method.name} but no implementation was provided. Available methods: ${Object.keys(impl).join(", ")}`);
        }
        return method.transformations.toREST(await implMethod(method.transformations.fromREST(servicePluginRequest)));
      }
    };
    return {
      initModule(servicePluginDefinition) {
        return (implementation) => {
          const implementations = servicePluginsImplementations.get(servicePluginDefinition.componentType.toLowerCase()) ?? [];
          implementations.push({ servicePluginDefinition, implementation });
          servicePluginsImplementations.set(servicePluginDefinition.componentType.toLowerCase(), implementations);
          servicePluginsEmitter.emit("registered", servicePluginDefinition);
        };
      },
      client
    };
  }
  var isServicePluginModule;
  var init_service_plugin_modules = __esm({
    "node_modules/@wix/sdk/build/service-plugin-modules.js"() {
      init_nanoevents2();
      isServicePluginModule = (val) => val.__type === "service-plugin-definition";
    }
  });

  // node_modules/@wix/sdk/build/wixClient.js
  function createClient(config) {
    const _headers = config.headers || { Authorization: "" };
    const defaultStrategy = {
      getAuthHeaders: (_) => Promise.resolve({ headers: {} })
    };
    const auth = config.auth;
    const getAuthStrategy = typeof auth === "function" ? auth : () => auth ?? defaultStrategy;
    const boundGetAuthHeaders = () => {
      return getAuthStrategy().getAuthHeaders(config.host);
    };
    const fetchWithAuth = async (urlOrRequest, requestInit) => {
      const authHeaders = await boundGetAuthHeaders();
      const headers = {
        ...requestInit?.headers ?? {},
        ...authHeaders.headers,
        ...config.host?.essentials?.passThroughHeaders,
        ..._headers[X_WIX_CONSISTENT_HEADER] ? { [X_WIX_CONSISTENT_HEADER]: _headers[X_WIX_CONSISTENT_HEADER] } : {}
      };
      const errorHandler = config.host?.getErrorHandler?.();
      try {
        if (typeof urlOrRequest === "string" || urlOrRequest instanceof URL) {
          const response = await fetch(urlOrRequest, {
            ...requestInit,
            headers
          });
          errorHandler?.handleError(response, {
            requestOptions: {
              url: urlOrRequest.toString(),
              method: requestInit?.method
            }
          });
          const consistentHeader = findConsistentHeader(response);
          if (consistentHeader) {
            _headers[X_WIX_CONSISTENT_HEADER] = consistentHeader;
          }
          return response;
        } else {
          for (const [k, v] of Object.entries(headers)) {
            if (typeof v === "string") {
              urlOrRequest.headers.set(k, v);
            }
          }
          const response = await fetch(urlOrRequest, requestInit);
          errorHandler?.handleError(response, {
            requestOptions: {
              url: urlOrRequest.url,
              method: requestInit?.method
            }
          });
          const consistentHeader = findConsistentHeader(response);
          if (consistentHeader) {
            _headers[X_WIX_CONSISTENT_HEADER] = consistentHeader;
          }
          return response;
        }
      } catch (e) {
        errorHandler?.handleError(e, {
          requestOptions: {
            url: typeof urlOrRequest === "string" || urlOrRequest instanceof URL ? urlOrRequest.toString() : urlOrRequest.url,
            method: requestInit?.method
          }
        });
        throw e;
      }
    };
    const { client: servicePluginsClient, initModule: initServicePluginModule } = servicePluginsModules(getAuthStrategy);
    const { client: eventHandlersClient, initModule: initEventHandlerModule } = eventHandlersModules(getAuthStrategy);
    const boundFetch = async (url, options) => {
      const authHeaders = await boundGetAuthHeaders();
      const defaultContentTypeHeader = getDefaultContentHeader(options);
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultContentTypeHeader,
          ..._headers,
          ...authHeaders?.headers,
          ...options?.headers,
          ...config.host?.essentials?.passThroughHeaders,
          // Ensure consistent header always takes precedence
          ..._headers[X_WIX_CONSISTENT_HEADER] ? { [X_WIX_CONSISTENT_HEADER]: _headers[X_WIX_CONSISTENT_HEADER] } : {}
        }
      });
      const consistentHeader = findConsistentHeader(response);
      if (consistentHeader) {
        _headers[X_WIX_CONSISTENT_HEADER] = consistentHeader;
      }
      return response;
    };
    const use = (modules, metadata) => {
      if (isEventHandlerModule(modules)) {
        return initEventHandlerModule(modules);
      } else if (isServicePluginModule(modules)) {
        return initServicePluginModule(modules);
      } else if (isHostModule(modules) && config.host) {
        return buildHostModule(modules, config.host);
      } else if (typeof modules === "function") {
        if ("__type" in modules && modules.__type === SERVICE_PLUGIN_ERROR_TYPE) {
          return modules;
        }
        const apiBaseUrl = config.host?.apiBaseUrl ?? DEFAULT_API_URL;
        const shouldUseCDN = config.useCDN === void 0 ? getAuthStrategy().shouldUseCDN : config.useCDN;
        return buildRESTDescriptor(
          runWithoutContext(() => isAmbassadorModule(modules)) ? toHTTPModule(modules) : modules,
          metadata ?? {},
          boundFetch,
          config.host?.getErrorHandler?.(),
          (relativeUrl, fetchOptions) => {
            const finalUrl = new URL(relativeUrl, `https://${apiBaseUrl}`);
            finalUrl.host = apiBaseUrl;
            finalUrl.protocol = "https";
            return boundFetch(finalUrl.toString(), fetchOptions);
          },
          getAuthStrategy().getActiveToken,
          // async wrapper normalizes the sync/async union from AuthenticationStrategy.getAuthHeaders
          async () => boundGetAuthHeaders(),
          { HTTPHost: apiBaseUrl },
          config.host?.name,
          shouldUseCDN,
          config.validateRequestSchema
        );
      } else if (isObject(modules)) {
        return Object.fromEntries(Object.entries(modules).map(([key, value]) => {
          return [key, use(value, modules[PUBLIC_METADATA_KEY])];
        }));
      } else {
        return modules;
      }
    };
    const setHeaders = (headers) => {
      for (const k in headers) {
        _headers[k] = headers[k];
      }
    };
    const wrappedModules = config.modules ? use(config.modules) : {};
    return {
      ...wrappedModules,
      get auth() {
        const authStrategy = getAuthStrategy();
        const originalGetAuthHeaders = authStrategy.getAuthHeaders;
        authStrategy.getAuthHeaders = originalGetAuthHeaders.bind(void 0, config.host);
        return authStrategy;
      },
      setHeaders,
      use,
      enableContext(contextType, opts = { elevated: false }) {
        if (contextType === "global") {
          if (globalThis.__wix_context__ != null) {
            if (opts.elevated) {
              globalThis.__wix_context__.elevatedClient = this;
            } else {
              globalThis.__wix_context__.client = this;
            }
          } else {
            if (opts.elevated) {
              globalThis.__wix_context__ = { elevatedClient: this };
            } else {
              globalThis.__wix_context__ = { client: this };
            }
          }
        } else {
          if (opts.elevated) {
            wixContext.elevatedClient = this;
          } else {
            wixContext.client = this;
          }
        }
      },
      /**
       * @param relativeUrl The URL to fetch relative to the API base URL
       * @param options The fetch options
       * @returns The fetch Response object
       * @deprecated Use `fetchWithAuth` instead
       */
      fetch: (relativeUrl, options) => {
        const apiBaseUrl = config.host?.apiBaseUrl ?? DEFAULT_API_URL;
        const finalUrl = new URL(relativeUrl, `https://${apiBaseUrl}`);
        finalUrl.host = apiBaseUrl;
        finalUrl.protocol = "https";
        return boundFetch(finalUrl.toString(), options);
      },
      fetchWithAuth,
      async graphql(query, variables, opts = {
        apiVersion: "alpha"
      }) {
        const apiBaseUrl = config?.host?.apiBaseUrl ?? DEFAULT_API_URL;
        const res = await boundFetch(`https://${apiBaseUrl}/graphql/${opts.apiVersion}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ query, variables })
        });
        if (res.status !== 200) {
          throw new FetchErrorResponse(`GraphQL request failed with status ${res.status}`, res);
        }
        const { data, errors } = await res.json();
        return { data: data ?? {}, errors };
      },
      webhooks: eventHandlersClient,
      servicePlugins: servicePluginsClient
    };
  }
  function findConsistentHeader(response) {
    return response.headers?.get(X_WIX_CONSISTENT_HEADER) ?? response.headers?.get(X_WIX_CONSISTENT_HEADER.toLowerCase());
  }
  var X_WIX_CONSISTENT_HEADER;
  var init_wixClient = __esm({
    "node_modules/@wix/sdk/build/wixClient.js"() {
      init_browser();
      init_browser2();
      init_ambassador_modules();
      init_common();
      init_fetch_error();
      init_helpers();
      init_host_modules();
      init_rest_modules();
      init_event_handlers_modules();
      init_service_plugin_modules();
      init_context();
      X_WIX_CONSISTENT_HEADER = "X-Wix-Consistent";
    }
  });

  // node_modules/@wix/sdk/build/wixMedia.js
  var init_wixMedia = __esm({
    "node_modules/@wix/sdk/build/wixMedia.js"() {
    }
  });

  // node_modules/@wix/sdk-runtime/build/rename-all-nested-keys.js
  function renameAllNestedKeys(payload, renameMap, ignorePaths) {
    const isIgnored = (path) => ignorePaths.includes(path);
    const traverse = (obj, path) => {
      if (Array.isArray(obj)) {
        obj.forEach((item) => {
          traverse(item, path);
        });
      } else if (typeof obj === "object" && obj !== null) {
        const objAsRecord = obj;
        Object.keys(objAsRecord).forEach((key) => {
          const newPath = path === "" ? key : `${path}.${key}`;
          if (isIgnored(newPath)) {
            return;
          }
          const transformedKey = renameKey(key, renameMap);
          if (transformedKey !== key && !(transformedKey in objAsRecord)) {
            objAsRecord[transformedKey] = objAsRecord[key];
            delete objAsRecord[key];
          }
          traverse(objAsRecord[transformedKey], newPath);
        });
      }
    };
    traverse(payload, "");
    return payload;
  }
  function renameKey(key, renameMap) {
    let transformedKey;
    if (key.includes(".")) {
      const parts = key.split(".");
      const transformedParts = parts.map((part) => renameMap[part] ?? part);
      transformedKey = transformedParts.join(".");
    } else {
      transformedKey = renameMap[key] ?? key;
    }
    return transformedKey;
  }
  function renameKeysFromRESTResponseToSDKResponse(payload, ignorePaths = []) {
    return renameAllNestedKeys(payload, RESTResponseToSDKResponseRenameMap, ignorePaths);
  }
  var init_rename_all_nested_keys = __esm({
    "node_modules/@wix/sdk-runtime/build/rename-all-nested-keys.js"() {
      init_constants();
    }
  });

  // node_modules/@wix/sdk-runtime/build/transformations/timestamp.js
  function transformRESTTimestampToSDKTimestamp(val) {
    return val ? new Date(val) : void 0;
  }
  var init_timestamp = __esm({
    "node_modules/@wix/sdk-runtime/build/transformations/timestamp.js"() {
    }
  });

  // node_modules/@wix/sdk-runtime/build/transformations/transform-paths.js
  function transformPath(obj, { path, isRepeated, isMap }, transformFn) {
    const pathParts = path.split(".");
    if (pathParts.length === 1 && path in obj) {
      obj[path] = isRepeated ? obj[path].map(transformFn) : isMap ? Object.fromEntries(Object.entries(obj[path]).map(([key, value]) => [key, transformFn(value)])) : transformFn(obj[path]);
      return obj;
    }
    const [first, ...rest] = pathParts;
    if (first.endsWith("{}")) {
      const cleanPath = first.slice(0, -2);
      obj[cleanPath] = Object.fromEntries(Object.entries(obj[cleanPath]).map(([key, value]) => [
        key,
        transformPath(value, { path: rest.join("."), isRepeated, isMap }, transformFn)
      ]));
    } else if (Array.isArray(obj[first])) {
      obj[first] = obj[first].map((item) => transformPath(item, { path: rest.join("."), isRepeated, isMap }, transformFn));
    } else if (first in obj && typeof obj[first] === "object" && obj[first] !== null) {
      obj[first] = transformPath(obj[first], { path: rest.join("."), isRepeated, isMap }, transformFn);
    } else if (first === "*") {
      Object.keys(obj).reduce((acc, curr) => {
        acc[curr] = transformPath(obj[curr], { path: rest.join("."), isRepeated, isMap }, transformFn);
        return acc;
      }, obj);
    }
    return obj;
  }
  function transformPaths(obj, transformations) {
    return transformations.reduce((acc, { paths, transformFn }) => paths.reduce((transformerAcc, path) => transformPath(transformerAcc, path, transformFn), acc), obj);
  }
  var init_transform_paths = __esm({
    "node_modules/@wix/sdk-runtime/build/transformations/transform-paths.js"() {
    }
  });

  // node_modules/@wix/sdk-runtime/build/event-definition-modules.js
  function createEventModule(eventDefinition) {
    return contextualizeEventDefinitionModuleV2(eventDefinition);
  }
  var init_event_definition_modules = __esm({
    "node_modules/@wix/sdk-runtime/build/event-definition-modules.js"() {
      init_context_v2();
    }
  });

  // node_modules/@wix/auto_sdk_redirects_redirects/build/es/index.mjs
  var onRedirectSessionCreated, onRedirectSessionCreated2;
  var init_es = __esm({
    "node_modules/@wix/auto_sdk_redirects_redirects/build/es/index.mjs"() {
      init_rename_all_nested_keys();
      init_timestamp();
      init_transform_paths();
      init_browser2();
      init_event_definition_modules();
      onRedirectSessionCreated = EventDefinition(
        "wix.headless.v1.redirect_session_created",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [{ path: "metadata.eventTime" }]
            }
          ])
        )
      )();
      onRedirectSessionCreated2 = createEventModule(
        onRedirectSessionCreated
      );
    }
  });

  // node_modules/@wix/redirects/build/es/index.mjs
  var init_es2 = __esm({
    "node_modules/@wix/redirects/build/es/index.mjs"() {
      init_es();
    }
  });

  // node_modules/@wix/auto_sdk_identity_authentication/build/es/index.mjs
  var init_es3 = __esm({
    "node_modules/@wix/auto_sdk_identity_authentication/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_identity_recovery/build/es/index.mjs
  var init_es4 = __esm({
    "node_modules/@wix/auto_sdk_identity_recovery/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_identity_verification/build/es/index.mjs
  var init_es5 = __esm({
    "node_modules/@wix/auto_sdk_identity_verification/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_identity_oauth/build/es/index.mjs
  var init_es6 = __esm({
    "node_modules/@wix/auto_sdk_identity_oauth/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/identity/build/es/index.mjs
  var init_es7 = __esm({
    "node_modules/@wix/identity/build/es/index.mjs"() {
      init_es3();
      init_es4();
      init_es5();
      init_es6();
    }
  });

  // node_modules/@wix/sdk/build/auth/oauth2/types.js
  var TokenRole;
  var init_types = __esm({
    "node_modules/@wix/sdk/build/auth/oauth2/types.js"() {
      (function(TokenRole2) {
        TokenRole2["NONE"] = "none";
        TokenRole2["VISITOR"] = "visitor";
        TokenRole2["MEMBER"] = "member";
      })(TokenRole || (TokenRole = {}));
    }
  });

  // node_modules/@wix/sdk/build/auth/oauth2/token-storage.js
  var EMPTY_TOKENS;
  var init_token_storage = __esm({
    "node_modules/@wix/sdk/build/auth/oauth2/token-storage.js"() {
      init_types();
      EMPTY_TOKENS = {
        accessToken: { value: "", expiresAt: 0 },
        refreshToken: { value: "", role: TokenRole.NONE }
      };
    }
  });

  // node_modules/@wix/sdk/build/auth/oauth2/OAuthStrategy.js
  var init_OAuthStrategy = __esm({
    "node_modules/@wix/sdk/build/auth/oauth2/OAuthStrategy.js"() {
      init_es2();
      init_es7();
    }
  });

  // node_modules/@wix/sdk/build/auth/ApiKeyAuthStrategy.js
  var init_ApiKeyAuthStrategy = __esm({
    "node_modules/@wix/sdk/build/auth/ApiKeyAuthStrategy.js"() {
    }
  });

  // node_modules/@wix/sdk/build/auth/AppStrategy.js
  var init_AppStrategy = __esm({
    "node_modules/@wix/sdk/build/auth/AppStrategy.js"() {
    }
  });

  // node_modules/@wix/sdk/build/index.js
  var init_build = __esm({
    "node_modules/@wix/sdk/build/index.js"() {
      init_wixClient();
      init_wixMedia();
      init_OAuthStrategy();
      init_types();
      init_token_storage();
      init_ApiKeyAuthStrategy();
      init_AppStrategy();
      init_browser2();
    }
  });

  // node_modules/@wix/site/dist/esm/utils.js
  function withResolvers() {
    let resolve = null;
    let reject = null;
    const promise = new Promise((resolveFn, rejectFn) => {
      resolve = resolveFn;
      reject = rejectFn;
    });
    return { promise, resolve, reject };
  }
  var init_utils2 = __esm({
    "node_modules/@wix/site/dist/esm/utils.js"() {
    }
  });

  // node_modules/@wix/site/dist/esm/websiteHostModule.js
  function getApiBaseUrl() {
    const wixEmbedsAPI = typeof window !== "undefined" ? window.wixEmbedsAPI : void 0;
    const apiBaseUrl = wixEmbedsAPI?.getExternalBaseUrl?.();
    if (!apiBaseUrl) {
      return;
    }
    const parsedUrlObject = new URL(apiBaseUrl);
    if (parsedUrlObject?.pathname && parsedUrlObject.pathname !== "/") {
      return `${parsedUrlObject.hostname}${parsedUrlObject.pathname}`;
    }
    return parsedUrlObject.hostname;
  }
  var createWebsiteModule;
  var init_websiteHostModule = __esm({
    "node_modules/@wix/site/dist/esm/websiteHostModule.js"() {
      init_utils2();
      createWebsiteModule = ({ createHost: createHost2 }) => {
        return {
          __type: "host",
          create: (_host) => {
            return {};
          },
          host: (options) => {
            const { applicationId } = options ?? {};
            const wixEmbedsAPI = typeof window !== "undefined" ? window.wixEmbedsAPI : void 0;
            const host = createHost2(options);
            const apiBaseUrl = getApiBaseUrl();
            return {
              ...host,
              apiBaseUrl,
              getMonitoringClient: wixEmbedsAPI?.getMonitoringClientFunction?.(applicationId),
              essentials: {
                language: typeof window !== "undefined" ? window.commonConfig?.language : void 0,
                locale: typeof window !== "undefined" ? window.commonConfig?.locale : void 0
              }
            };
          },
          auth: (getAccessTokenFn) => {
            const wixEmbedsAPI = typeof window !== "undefined" ? window.wixEmbedsAPI : void 0;
            if (!getAccessTokenFn) {
              getAccessTokenFn = wixEmbedsAPI?.getAccessTokenFunction?.();
            }
            let injectorCreated = false;
            const { resolve: resolveAccessTokenFn, promise: accessTokenFnPromise } = withResolvers();
            return {
              getAuthHeaders: async () => {
                if (!getAccessTokenFn && injectorCreated) {
                  getAccessTokenFn = await accessTokenFnPromise;
                }
                if (!getAccessTokenFn) {
                  throw new Error("Failed to resolve auth token");
                }
                return {
                  headers: {
                    Authorization: await getAccessTokenFn()
                  }
                };
              },
              getAccessTokenInjector: () => {
                injectorCreated = true;
                return (_getAccessTokenFn) => {
                  resolveAccessTokenFn(_getAccessTokenFn);
                };
              }
            };
          }
        };
      };
    }
  });

  // node_modules/@wix/site/dist/esm/channel.js
  var createWebsiteChannel;
  var init_channel = __esm({
    "node_modules/@wix/site/dist/esm/channel.js"() {
      createWebsiteChannel = ({ clientSdk, applicationId }) => {
        return {
          invoke: async ({ namespace, method, args }) => {
            if (!clientSdk) {
              throw new Error("Wix Site SDK only works in a Wix site environment. Learn more: https://dev.wix.com/docs/sdk/host-modules/site/introduction");
            }
            return clientSdk.invoke({
              namespace,
              method,
              args,
              applicationId,
              accessToken: "accessToken"
            });
          },
          getAccessToken: () => {
            throw new Error("Not implemented");
          },
          observeState: () => ({
            disconnect: () => {
            }
          })
        };
      };
    }
  });

  // node_modules/@wix/site/dist/esm/hostPlatform.js
  var createHost;
  var init_hostPlatform = __esm({
    "node_modules/@wix/site/dist/esm/hostPlatform.js"() {
      init_channel();
      createHost = function(config) {
        const clientSdk = (typeof $wixContext !== "undefined" ? $wixContext.clientSdk : void 0) ?? config?.clientSdk ?? (typeof window !== "undefined" ? window?.clientSdk : void 0);
        const { applicationId } = config || {};
        if (!applicationId) {
          throw new Error('"createHost" was called without a required field "applicationId"');
        }
        return {
          // environment: {},
          channel: createWebsiteChannel({ clientSdk, applicationId }),
          close: () => {
          }
        };
      };
    }
  });

  // node_modules/@wix/site/dist/esm/types.js
  var init_types2 = __esm({
    "node_modules/@wix/site/dist/esm/types.js"() {
    }
  });

  // node_modules/@wix/site/dist/esm/index.js
  var site;
  var init_esm = __esm({
    "node_modules/@wix/site/dist/esm/index.js"() {
      init_websiteHostModule();
      init_hostPlatform();
      init_types2();
      site = createWebsiteModule({ createHost });
    }
  });

  // public/consultant-login.js
  var require_consultant_login = __commonJS({
    "public/consultant-login.js"() {
      init_build();
      init_esm();
      var BACKEND = "https://test-wix-consultant.zend-apps.com";
      var REACT = "https://viewy-hyperintelligently-toshiko.ngrok-free.dev";
      var wixClient = createClient({
        auth: site.auth(),
        host: site.host({
          applicationId: "e87fc4f0-d74b-463f-ad77-b813eec84846"
        })
      });
      var ConsultantLogin = class extends HTMLElement {
        constructor() {
          super();
          this.loaded = false;
          this.instance = null;
          this.instanceId = null;
          this.wixMember = null;
          this.accessTokenListener = wixClient.auth.getAccessTokenInjector();
        }
        async fetchInstance() {
          for (let i = 0; i < 8; i++) {
            try {
              const response = await wixClient.fetchWithAuth(
                `${BACKEND}/api/wix/get-instance`
              );
              if (!response.ok) {
                throw new Error(`get-instance HTTP ${response.status}`);
              }
              const data = await response.json();
              this.instanceId = data.instanceId || data.instance || null;
              this.instance = data.instance || this.instanceId || null;
              if (this.instanceId) {
                console.log("\u2705 Wix instance:", this.instanceId);
                return true;
              }
            } catch (err) {
              console.warn(`\u26A0\uFE0F get-instance attempt ${i + 1} failed:`, err.message);
              await new Promise((r) => setTimeout(r, 800));
            }
          }
          return false;
        }
        async connectedCallback() {
          console.log("\u{1F504} Widget connected...");
          const memberPromise = this.waitForMember();
          await this.fetchInstance();
          await memberPromise;
          if (!this.instance) {
            console.error(
              "\u274C No Wix instance \u2014 check app is installed, applicationId matches, and BACKEND URL is allowed in the Wix app"
            );
          }
          const token = localStorage.getItem("token");
          const isLoggedIn = localStorage.getItem("consultant_logged_in");
          this.createIframe(token && isLoggedIn === "true" ? "dashboard" : "login");
        }
        waitForMember() {
          return new Promise((resolve) => {
            if (window.parent?.wixUserId) {
              console.log("\u2705 globalThis se mila");
              this._processMember(
                {
                  type: "WIX_MEMBER",
                  memberId: window.parent.wixUserId,
                  email: window.parent.wixUserEmail
                },
                resolve
              );
              return;
            }
            const timeout = setTimeout(() => {
              console.warn("\u26A0\uFE0F Timeout \u2014 guest user");
              resolve();
            }, 15e3);
            const handler = async (event) => {
              if (event.data?.type !== "WIX_MEMBER") return;
              console.log("\u2705 WIX_MEMBER pakda:", event.data.email);
              window.postMessage({ type: "WIX_MEMBER_RECEIVED" }, "*");
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              await this._processMember(event.data, resolve);
            };
            window.addEventListener("message", handler);
            console.log("\u{1F442} Listener ready");
          });
        }
        async _processMember(data, resolve) {
          try {
            const res = await fetch(`${BACKEND}/api/wix-user-session`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                wixMemberId: data.memberId,
                email: data.email,
                firstName: data.firstName || "",
                lastName: data.lastName || "",
                photo: data.photo || "",
                instanceId: this.instanceId
              })
            });
            const saved = await res.json();
            console.log("\u2705 DB save:", saved.dbId);
            if (saved.dbId) {
              localStorage.setItem("wix_customer_id", saved.dbId);
              ["wix_user_db_id", "client_u_Identity", "user_id", "userId"].forEach(
                (k) => localStorage.removeItem(k)
              );
              localStorage.setItem("wix_member_id", data.memberId);
              localStorage.setItem("wix_email", data.email);
              localStorage.setItem("wix_first_name", data.firstName || "");
              localStorage.setItem("wix_last_name", data.lastName || "");
              localStorage.setItem("wix_photo", data.photo || "");
              this.wixMember = {
                id: data.memberId,
                email: data.email,
                firstName: data.firstName || "",
                lastName: data.lastName || "",
                photo: data.photo || "",
                dbId: saved.dbId
              };
            }
          } catch (e) {
            console.error("\u274C Save error:", e.message);
          }
          resolve();
        }
        createIframe(page) {
          if (this.loaded) return;
          this.loaded = true;
          this.innerHTML = "";
          const defaultH = page === "dashboard" ? 920 : 500;
          this.style.cssText = `display:block; width:100%; min-height:${defaultH}px; position:relative;`;
          const params = new URLSearchParams();
          params.set("instance", this.instance || this.instanceId || "");
          if (this.wixMember) {
            params.set("wixLoggedIn", "true");
            params.set("wixMemberId", this.wixMember.id || "");
            params.set("wixEmail", this.wixMember.email || "");
            params.set("wixName", this.wixMember.firstName || "");
            params.set("wixLastName", this.wixMember.lastName || "");
            params.set("wixPhoto", this.wixMember.photo || "");
            params.set("wixDbId", this.wixMember.dbId || "");
            console.log("\u2705 Logged in user \u2014 dashboard load hoga");
          } else {
            params.set("wixLoggedIn", "false");
            console.log("\u274C Guest user \u2014 login page load hoga");
          }
          const iframe = document.createElement("iframe");
          iframe.src = page === "dashboard" ? `${REACT}/consultant-dashboard?${params.toString()}` : `${REACT}/consultant/card?${params.toString()}`;
          iframe.style.cssText = `width:100%; height:${defaultH}px; min-height:${defaultH}px; border:none; display:block;`;
          iframe.allow = "camera; microphone";
          window.addEventListener("message", (event) => {
            if (event.data?.type === "IFRAME_HEIGHT") {
              const h = Math.max(defaultH, Number(event.data.height) || defaultH);
              iframe.style.height = h + "px";
              iframe.style.minHeight = h + "px";
              this.style.minHeight = h + "px";
              return;
            }
            if (event.data?.tokenGenerated === true) {
              console.log("\u2705 Login success \u2014 dashboard load hoga");
              this.loaded = false;
              this.innerHTML = "";
              this.createIframe("dashboard");
              return;
            }
            if (event.data?.consultantLoggedOut === true) {
              console.log("\u2705 Logout \u2014 login page load hoga");
              this.loaded = false;
              this.innerHTML = "";
              this.wixMember = null;
              localStorage.removeItem("wix_customer_id");
              ["wix_user_db_id", "client_u_Identity", "user_id", "userId"].forEach(
                (k) => localStorage.removeItem(k)
              );
              localStorage.removeItem("wix_member_id");
              localStorage.removeItem("wix_email");
              localStorage.removeItem("wix_first_name");
              localStorage.removeItem("wix_last_name");
              localStorage.removeItem("wix_photo");
              localStorage.removeItem("token");
              localStorage.removeItem("consultant_logged_in");
              this.createIframe("login");
              return;
            }
            if (event.data?.type === "WIX_MEMBER" && !this.wixMember) {
              console.log("\u2705 Late WIX_MEMBER mila \u2014 reloading");
              this.loaded = false;
              this.innerHTML = "";
              this.connectedCallback();
              return;
            }
          });
          this.appendChild(iframe);
          console.log("\u2705 Iframe loaded:", iframe.src);
        }
      };
      if (!customElements.get("our-consultant")) {
        customElements.define("our-consultant", ConsultantLogin);
      }
    }
  });
  return require_consultant_login();
})();
