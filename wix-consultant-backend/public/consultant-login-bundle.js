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
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
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
  function contextualizeRESTModuleV2(restModule, elevated) {
    return ((...args) => {
      const context = resolveContext();
      if (!context) {
        return restModule.apply(void 0, args);
      }
      return context.initWixModules(restModule, elevated).apply(void 0, args);
    });
  }
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
  var SDKRequestToRESTRequestRenameMap, RESTResponseToSDKResponseRenameMap, ITEMS_RESULT_PROPERTY_NAME, PAGING_METADATA_RESULT_PROPERTY_NAME, DEFAULT_LIMIT;
  var init_constants = __esm({
    "node_modules/@wix/sdk-runtime/build/constants.js"() {
      SDKRequestToRESTRequestRenameMap = {
        _id: "id",
        _createdDate: "createdDate",
        _updatedDate: "updatedDate"
      };
      RESTResponseToSDKResponseRenameMap = {
        id: "_id",
        createdDate: "_createdDate",
        updatedDate: "_updatedDate"
      };
      ITEMS_RESULT_PROPERTY_NAME = "items";
      PAGING_METADATA_RESULT_PROPERTY_NAME = "pagingMetadata";
      DEFAULT_LIMIT = 50;
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
  function createRESTModule(descriptor, elevated = false) {
    return contextualizeRESTModuleV2(descriptor, elevated);
  }
  function toURLSearchParams(params, isComplexRequest) {
    const flatten = flattenParams(params);
    const isPayloadNonSerializableAsUrlSearchParams = Object.entries(flatten).some(([key, value]) => key.includes(".") || Array.isArray(value) && value.some((v) => typeof v === "object"));
    const shouldSerializeToRParam = isComplexRequest && isPayloadNonSerializableAsUrlSearchParams;
    if (shouldSerializeToRParam) {
      return new URLSearchParams({ ".r": base64Encode(JSON.stringify(params)) });
    } else {
      return Object.entries(flatten).reduce((urlSearchParams, [key, value]) => {
        const keyParams = Array.isArray(value) ? value : [value];
        keyParams.forEach((param) => {
          if (param === void 0 || param === null || Array.isArray(value) && typeof param === "object") {
            return;
          }
          urlSearchParams.append(key, param);
        });
        return urlSearchParams;
      }, new URLSearchParams());
    }
  }
  function resolveUrl(opts) {
    const domain = resolveDomain(opts.host);
    const mappings = resolveMappingsByDomain(domain, opts.domainToMappings);
    const path = injectDataIntoProtoPath(opts.protoPath, opts.data || {});
    return resolvePathFromMappings(path, mappings);
  }
  function flattenParams(data, path = "") {
    const params = {};
    Object.entries(data).forEach(([key, value]) => {
      const isObject2 = value !== null && typeof value === "object" && !Array.isArray(value);
      const fieldPath = resolvePath(path, key);
      if (isObject2) {
        const serializedObject = flattenParams(value, fieldPath);
        Object.assign(params, serializedObject);
      } else {
        params[fieldPath] = value;
      }
    });
    return params;
  }
  function resolvePath(path, key) {
    return `${path}${path ? "." : ""}${key}`;
  }
  function resolveDomain(host) {
    const resolvedHost = fixHostExceptions(host);
    return resolvedHost.replace(REGEX_CAPTURE_DOMAINS, "._base_domain_").replace(REGEX_CAPTURE_API_DOMAINS, "._api_base_domain_").replace(REGEX_CAPTURE_DEV_WIX_CODE_DOMAIN, "*.dev.wix-code.com");
  }
  function fixHostExceptions(host) {
    return host.replace("create.editorx.com", "editor.editorx.com");
  }
  function resolveMappingsByDomain(domain, domainToMappings) {
    const mappings = domainToMappings[domain] || domainToMappings[USER_DOMAIN];
    if (mappings) {
      return mappings;
    }
    const rootDomainMappings = resolveRootDomain(domain, domainToMappings);
    if (!rootDomainMappings) {
      if (isBaseDomain(domain)) {
        return domainToMappings[wwwBaseDomain];
      }
    }
    return rootDomainMappings ?? [];
  }
  function resolveRootDomain(domain, domainToMappings) {
    return Object.entries(domainToMappings).find(([entryDomain]) => {
      const [, ...rooDomainSegments] = domain.split(".");
      return rooDomainSegments.join(".") === entryDomain;
    })?.[1];
  }
  function isBaseDomain(domain) {
    return !!domain.match(/\._base_domain_$/);
  }
  function injectDataIntoProtoPath(protoPath, data) {
    return protoPath.split("/").map((path) => maybeProtoPathToData(path, data)).join("/");
  }
  function maybeProtoPathToData(protoPath, data) {
    const protoRegExpMatch = protoPath.match(REGEX_CAPTURE_PROTO_FIELD) || [];
    const field = protoRegExpMatch[1];
    if (field) {
      const suffix = protoPath.replace(protoRegExpMatch[0], "");
      return findByPath(data, field, protoPath, suffix);
    }
    return protoPath;
  }
  function findByPath(obj, path, defaultValue, suffix) {
    let result = obj;
    for (const field of path.split(".")) {
      if (!result) {
        return defaultValue;
      }
      result = result[field];
    }
    return `${result}${suffix}`;
  }
  function resolvePathFromMappings(protoPath, mappings) {
    const mapping = mappings?.find((m) => protoPath.startsWith(m.destPath));
    if (!mapping) {
      return protoPath;
    }
    return mapping.srcPath + protoPath.slice(mapping.destPath.length);
  }
  var base64Encode, DOMAINS, USER_DOMAIN, REGEX_CAPTURE_DOMAINS, WIX_API_DOMAINS, DEV_WIX_CODE_DOMAIN, REGEX_CAPTURE_PROTO_FIELD, REGEX_CAPTURE_API_DOMAINS, REGEX_CAPTURE_DEV_WIX_CODE_DOMAIN, wwwBaseDomain;
  var init_rest_modules2 = __esm({
    "node_modules/@wix/sdk-runtime/build/rest-modules.js"() {
      init_context_v2();
      init_constants();
      base64Encode = (value) => {
        const bytes = new TextEncoder().encode(value);
        const base64 = typeof btoa !== "undefined" ? btoa(String.fromCodePoint(...bytes)) : Buffer.from(value, "utf-8").toString("base64");
        return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      };
      DOMAINS = ["wix.com", "editorx.com"];
      USER_DOMAIN = "_";
      REGEX_CAPTURE_DOMAINS = new RegExp(`\\.(${DOMAINS.join("|")})$`);
      WIX_API_DOMAINS = ["42.wixprod.net", "uw2-edt-1.wixprod.net"];
      DEV_WIX_CODE_DOMAIN = "dev.wix-code.com";
      REGEX_CAPTURE_PROTO_FIELD = /{(.*)}/;
      REGEX_CAPTURE_API_DOMAINS = new RegExp(`\\.(${WIX_API_DOMAINS.join("|")})$`);
      REGEX_CAPTURE_DEV_WIX_CODE_DOMAIN = new RegExp(`.*\\.${DEV_WIX_CODE_DOMAIN}$`);
      wwwBaseDomain = "www._base_domain_";
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
  function renameKeysFromSDKRequestToRESTRequest(payload, ignorePaths = []) {
    return renameAllNestedKeys(payload, SDKRequestToRESTRequestRenameMap, ignorePaths);
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
  function transformSDKTimestampToRESTTimestamp(val) {
    return val?.toISOString();
  }
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

  // node_modules/@wix/sdk-runtime/build/transformations/float.js
  function transformRESTFloatToSDKFloat(val) {
    if (val === "NaN") {
      return NaN;
    }
    if (val === "Infinity") {
      return Infinity;
    }
    if (val === "-Infinity") {
      return -Infinity;
    }
    return val;
  }
  var init_float = __esm({
    "node_modules/@wix/sdk-runtime/build/transformations/float.js"() {
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

  // node_modules/@wix/auto_sdk_members_badges/build/es/index.mjs
  var onBadgeAssigned, onBadgeUnassigned, onBadgeAssigned2, onBadgeUnassigned2;
  var init_es8 = __esm({
    "node_modules/@wix/auto_sdk_members_badges/build/es/index.mjs"() {
      init_rename_all_nested_keys();
      init_timestamp();
      init_transform_paths();
      init_browser2();
      init_event_definition_modules();
      onBadgeAssigned = EventDefinition(
        "wix.badges.v3.badge_badge_assigned",
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
      onBadgeUnassigned = EventDefinition(
        "wix.badges.v3.badge_badge_unassigned",
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
      onBadgeAssigned2 = createEventModule(onBadgeAssigned);
      onBadgeUnassigned2 = createEventModule(onBadgeUnassigned);
    }
  });

  // node_modules/@wix/sdk-runtime/build/transformations/image.js
  function transformRESTImageToSDKImage(payload) {
    if (!payload) {
      return;
    }
    let fileNameOrAltText = "";
    if (payload.filename || payload.altText) {
      fileNameOrAltText = `/${encodeURIComponent(payload.filename || payload.altText)}`;
    }
    return payload.id ? `wix:image://v1/${payload.id}${fileNameOrAltText}#originWidth=${payload.width}&originHeight=${payload.height}` : payload.url;
  }
  var init_image = __esm({
    "node_modules/@wix/sdk-runtime/build/transformations/image.js"() {
    }
  });

  // node_modules/@wix/sdk-runtime/build/query-filter.js
  function isAndOperator(filter) {
    return Object.keys(filter).length === 1 && "$and" in filter && Array.isArray(filter.$and);
  }
  function isOrOperator(filter) {
    return Object.keys(filter).length === 1 && "$or" in filter && Array.isArray(filter.$or);
  }
  function isNotOperator(filter) {
    return Object.keys(filter).length === 1 && "$not" in filter && typeof filter.$not === "object";
  }
  function and(a, b) {
    if (typeof a === "undefined" || Object.keys(a).length === 0) {
      return b;
    } else if (typeof b === "undefined" || Object.keys(b).length === 0) {
      return a;
    } else {
      return {
        $and: [
          ...isAndOperator(a) ? a.$and : [a],
          ...isAndOperator(b) ? b.$and : [b]
        ]
      };
    }
  }
  function or(a, b) {
    if (typeof a === "undefined" || Object.keys(a).length === 0) {
      return b;
    } else if (typeof b === "undefined" || Object.keys(b).length === 0) {
      return a;
    } else {
      return {
        $or: [
          ...isOrOperator(a) ? a.$or : [a],
          ...isOrOperator(b) ? b.$or : [b]
        ]
      };
    }
  }
  function not(a) {
    if (typeof a === "undefined" || Object.keys(a).length === 0) {
      return void 0;
    } else if (isNotOperator(a)) {
      return a.$not;
    } else {
      return { $not: a };
    }
  }
  var init_query_filter = __esm({
    "node_modules/@wix/sdk-runtime/build/query-filter.js"() {
    }
  });

  // node_modules/@wix/sdk-runtime/build/query-iterators.js
  var Iterator, CursorBasedIterator, OffsetBasedIterator;
  var init_query_iterators = __esm({
    "node_modules/@wix/sdk-runtime/build/query-iterators.js"() {
      Iterator = class {
        constructor({ items, originQuery, fetchNextPage, fetchPrevPage, limit }) {
          __publicField(this, "_items");
          __publicField(this, "_fetchNextPage");
          __publicField(this, "_fetchPrevPage");
          __publicField(this, "_originQuery");
          __publicField(this, "_limit");
          this._items = items;
          this._fetchNextPage = fetchNextPage;
          this._fetchPrevPage = fetchPrevPage;
          this._originQuery = originQuery;
          this._limit = limit;
        }
        get items() {
          return this._items;
        }
        get length() {
          return this._items.length;
        }
        get pageSize() {
          return this._limit;
        }
        get query() {
          return this._originQuery;
        }
        async next() {
          if (!this.hasNext()) {
            throw new Error("No next page to fetch");
          }
          const nextPageIterator = await this._fetchNextPage();
          return nextPageIterator;
        }
        async prev() {
          if (!this.hasPrev()) {
            throw new Error("No previous page to fetch");
          }
          const previousPageIterator = await this._fetchPrevPage();
          return previousPageIterator;
        }
      };
      CursorBasedIterator = class extends Iterator {
        constructor({ items, originQuery, fetchNextPage, fetchPrevPage, limit, nextCursor, prevCursor }) {
          super({ items, originQuery, fetchNextPage, fetchPrevPage, limit });
          __publicField(this, "_nextCursor");
          __publicField(this, "_prevCursor");
          __publicField(this, "cursors");
          this._nextCursor = nextCursor;
          this._prevCursor = prevCursor;
          this.cursors = {
            next: nextCursor,
            prev: prevCursor
          };
        }
        hasNext() {
          return !!this._nextCursor;
        }
        hasPrev() {
          return !!this._prevCursor;
        }
      };
      OffsetBasedIterator = class extends Iterator {
        constructor({ items, fetchNextPage, fetchPrevPage, offset, originQuery, limit, totalCount, tooManyToCount }) {
          super({ items, fetchNextPage, fetchPrevPage, originQuery, limit });
          __publicField(this, "_totalCount");
          __publicField(this, "_offset");
          __publicField(this, "_tooManyToCount");
          this._totalCount = totalCount;
          this._offset = offset;
          this._tooManyToCount = tooManyToCount;
        }
        get currentPage() {
          return this._limit === 0 ? void 0 : Math.floor(this._offset / this._limit);
        }
        get totalPages() {
          return this._tooManyToCount || this._limit === 0 ? void 0 : Math.ceil(this._totalCount / this._limit);
        }
        get totalCount() {
          return this._tooManyToCount ? void 0 : this._totalCount;
        }
        hasNext() {
          return Boolean(this._limit !== 0 && this.currentPage !== void 0 && // currentPage 0 is the first page
          this.totalPages !== void 0 && this.currentPage < this.totalPages - 1);
        }
        hasPrev() {
          return Boolean(this._limit !== 0 && this.currentPage && this.currentPage > 0);
        }
      };
    }
  });

  // node_modules/@wix/sdk-runtime/build/query-builder.js
  function queryBuilder(opts) {
    const createQueryBuilder = (query) => {
      return {
        query,
        async find() {
          try {
            const request = opts.requestTransformer(opts.pagingMethod === "CURSOR" && query.cursorPaging.cursor ? {
              cursorPaging: query.cursorPaging
            } : query);
            const response = await opts.func(request);
            const { [ITEMS_RESULT_PROPERTY_NAME]: items, [PAGING_METADATA_RESULT_PROPERTY_NAME]: pagingMetadata } = opts.responseTransformer(response);
            if (opts.pagingMethod === "OFFSET") {
              const offsetQuery = query;
              return new OffsetBasedIterator({
                items: items ?? [],
                fetchNextPage: () => {
                  return createQueryBuilder({
                    ...offsetQuery,
                    paging: {
                      offset: offsetQuery.paging.offset + offsetQuery.paging.limit,
                      limit: offsetQuery.paging.limit
                    }
                  }).find();
                },
                fetchPrevPage: () => {
                  return createQueryBuilder({
                    ...query,
                    paging: {
                      offset: Math.max(offsetQuery.paging.offset - offsetQuery.paging.limit, 0),
                      limit: offsetQuery.paging.limit
                    }
                  }).find();
                },
                offset: offsetQuery.paging.offset,
                limit: offsetQuery.paging.limit,
                totalCount: pagingMetadata?.total,
                tooManyToCount: pagingMetadata?.tooManyToCount,
                originQuery: this
              });
            }
            const paging = query.cursorPaging;
            return new CursorBasedIterator({
              items: items ?? [],
              limit: paging.limit,
              originQuery: this,
              fetchNextPage: () => {
                return createQueryBuilder({
                  ...query,
                  cursorPaging: {
                    cursor: pagingMetadata?.cursors?.next ?? void 0,
                    limit: paging.limit
                  }
                }).find();
              },
              fetchPrevPage: () => {
                return createQueryBuilder({
                  ...query,
                  cursorPaging: {
                    cursor: pagingMetadata?.cursors?.prev ?? void 0,
                    limit: paging.limit
                  }
                }).find();
              },
              prevCursor: pagingMetadata?.cursors?.prev ?? void 0,
              nextCursor: pagingMetadata?.cursors?.next ?? void 0
            });
          } catch (err) {
            throw opts.errorTransformer(err);
          }
        },
        skipTo(cursor) {
          return createQueryBuilder({
            ...query,
            cursorPaging: {
              cursor,
              limit: query.cursorPaging.limit
            }
          });
        },
        eq(field, value) {
          const serializableValue = typeof value === "undefined" ? null : value;
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: serializableValue
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        ne(field, value) {
          const serializableValue = typeof value === "undefined" ? null : value;
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: {
              $ne: serializableValue
            }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        ge(field, value) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: {
              $gte: value
            }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        gt(field, value) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: { $gt: value }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        le(field, value) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: {
              $lte: value
            }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        lt(field, value) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: { $lt: value }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        isNotEmpty(field) {
          return this.ne(field, null);
        },
        isEmpty(field) {
          return this.eq(field, null);
        },
        startsWith(field, value) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: {
              $startsWith: value
            }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        endsWith(field, value) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: {
              $endsWith: value
            }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        contains(field, value) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: {
              $contains: value
            }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        hasSome(field, ...values) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: {
              $hasSome: Array.isArray(values[0]) ? values[0] : values
            }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        hasAll(field, ...values) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: {
              $hasAll: Array.isArray(values[0]) ? values[0] : values
            }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        between(field, from, to) {
          return this.ge(field, from).lt(field, to);
        },
        in(field, values) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: {
              $in: values
            }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        exists(field, value = true) {
          const newFilter = {
            [renameFieldByPaths(opts.transformationPaths, field)]: {
              $exists: value
            }
          };
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, newFilter)
          });
        },
        or(orQuery) {
          return createQueryBuilder({
            ...query,
            filter: or(query.filter, orQuery.query.filter)
          });
        },
        and(andQuery) {
          return createQueryBuilder({
            ...query,
            filter: and(query.filter, andQuery.query.filter)
          });
        },
        not(notQuery) {
          return createQueryBuilder({
            ...query,
            filter: not(notQuery.query.filter)
          });
        },
        ascending(...fieldNames) {
          return createQueryBuilder({
            ...query,
            sort: [
              ...query.sort ?? [],
              ...fieldNames.map((fieldName) => ({
                fieldName: renameFieldByPaths(opts.transformationPaths, fieldName),
                order: "ASC"
              }))
            ]
          });
        },
        descending(...fieldNames) {
          return createQueryBuilder({
            ...query,
            sort: [
              ...query.sort ?? [],
              ...fieldNames.map((fieldName) => ({
                fieldName: renameFieldByPaths(opts.transformationPaths, fieldName),
                order: "DESC"
              }))
            ]
          });
        },
        skip(offset) {
          return createQueryBuilder({
            ...query,
            paging: {
              offset,
              limit: "limit" in query.paging ? query.paging.limit : DEFAULT_LIMIT
            }
          });
        },
        limit(limit) {
          if (opts.pagingMethod === "CURSOR") {
            const cursorQuery = query;
            return createQueryBuilder({
              ...query,
              cursorPaging: {
                limit,
                cursor: "cursor" in cursorQuery.cursorPaging ? cursorQuery.cursorPaging.cursor : void 0
              }
            });
          }
          const offsetQuery = query;
          return createQueryBuilder({
            ...query,
            paging: {
              limit,
              offset: "offset" in offsetQuery.paging ? offsetQuery.paging.offset : 0
            }
          });
        }
      };
    };
    return createQueryBuilder({
      filter: {},
      ...opts.pagingMethod === "OFFSET" ? { paging: { offset: 0, limit: DEFAULT_LIMIT } } : { cursorPaging: { limit: DEFAULT_LIMIT } }
    });
  }
  function renameFieldByPaths(transformationPaths, fieldPath) {
    const transformationPath = Object.entries(transformationPaths).find(([path]) => path === fieldPath || fieldPath.startsWith(`${path}.`))?.[0];
    if (transformationPath) {
      return fieldPath.replace(transformationPath, transformationPaths[transformationPath]);
    }
    return fieldPath.split(".").map((segment) => transformationPaths[segment] ?? SDKRequestToRESTRequestRenameMap[segment] ?? segment).join(".");
  }
  var init_query_builder = __esm({
    "node_modules/@wix/sdk-runtime/build/query-builder.js"() {
      init_constants();
      init_query_filter();
      init_query_iterators();
    }
  });

  // node_modules/@wix/sdk-runtime/build/wql-builder-utils.js
  function createFieldFilter(field, existingOps = {}) {
    const createChained = (op, value) => {
      const newOps = { ...existingOps, [op]: value };
      return createFieldFilter(field, newOps);
    };
    const getFilter = () => {
      if (Object.keys(existingOps).length === 0) {
        return {};
      }
      return { [field]: existingOps };
    };
    return {
      // FilterExpression interface - makes this usable directly
      get filter() {
        return getFilter();
      },
      // Chainable methods
      eq: (value) => createChained("$eq", value),
      ne: (value) => createChained("$ne", value),
      gt: (value) => createChained("$gt", value),
      gte: (value) => createChained("$gte", value),
      lt: (value) => createChained("$lt", value),
      lte: (value) => createChained("$lte", value),
      startsWith: (value) => createChained("$startsWith", value),
      endsWith: (value) => createChained("$endsWith", value),
      contains: (value) => createChained("$contains", value),
      in: (values) => createChained("$in", values),
      nin: (values) => createChained("$nin", values),
      hasSome: (values) => createChained("$hasSome", values),
      hasAll: (values) => createChained("$hasAll", values),
      exists: (value = true) => createChained("$exists", value),
      isEmpty: (value = true) => createChained("$isEmpty", value),
      isNotEmpty: () => createChained("$ne", null)
    };
  }
  function createFilterFactory() {
    const filterFn = (field) => {
      return createFieldFilter(field);
    };
    const Filter = Object.assign(filterFn, {
      and: (...filters) => ({
        filter: {
          $and: filters.map((f) => f.filter)
        }
      }),
      or: (...filters) => ({
        filter: {
          $or: filters.map((f) => f.filter)
        }
      }),
      not: (filter) => ({
        filter: { $not: filter.filter }
      })
    });
    return Filter;
  }
  function createSortFactory() {
    return ((field) => ({
      asc: () => ({
        sort: { fieldName: field, order: "ASC" }
      }),
      desc: () => ({
        sort: { fieldName: field, order: "DESC" }
      })
    }));
  }
  var init_wql_builder_utils = __esm({
    "node_modules/@wix/sdk-runtime/build/wql-builder-utils.js"() {
    }
  });

  // node_modules/@wix/sdk-runtime/build/query-builder-utils.js
  function createQueryBuilderFactory() {
    return () => {
      let state = {};
      const builder = {
        withFilter(filterExpr) {
          state = { ...state, filter: filterExpr.filter };
          return builder;
        },
        withFields(...fields) {
          state = { ...state, fields };
          return builder;
        },
        withSorting(...sorts) {
          state = { ...state, sort: sorts.map((s) => s.sort) };
          return builder;
        },
        withPaging(paging) {
          state = { ...state, paging };
          return builder;
        },
        build() {
          return state;
        }
      };
      return builder;
    };
  }
  function createQueryUtils() {
    return {
      QueryBuilder: createQueryBuilderFactory(),
      Filter: createFilterFactory(),
      Sort: createSortFactory()
    };
  }
  var init_query_builder_utils = __esm({
    "node_modules/@wix/sdk-runtime/build/query-builder-utils.js"() {
      init_wql_builder_utils();
    }
  });

  // node_modules/@wix/sdk-runtime/build/query-type-guards.js
  function hasQueryProperties(obj, queryKeys) {
    if (!obj || typeof obj !== "object") {
      return false;
    }
    const hasQueryProps = queryKeys.some((key) => obj.hasOwnProperty(key));
    const isEmpty = Object.keys(obj).length === 0;
    return hasQueryProps || isEmpty;
  }
  function isCursorQuery(obj) {
    return hasQueryProperties(obj, CURSOR_QUERY_KEYS);
  }
  function isQueryV2(obj) {
    return hasQueryProperties(obj, QUERY_V2_KEYS);
  }
  var FILTER, SORT, CURSOR_PAGING, PAGING, CURSOR_QUERY_KEYS, QUERY_V2_KEYS;
  var init_query_type_guards = __esm({
    "node_modules/@wix/sdk-runtime/build/query-type-guards.js"() {
      FILTER = "filter";
      SORT = "sort";
      CURSOR_PAGING = "cursorPaging";
      PAGING = "paging";
      CURSOR_QUERY_KEYS = [FILTER, SORT, CURSOR_PAGING];
      QUERY_V2_KEYS = [FILTER, SORT, PAGING];
    }
  });

  // node_modules/@wix/sdk-runtime/build/query-method-router.js
  function createQueryOverloadRouter(options) {
    const { hasOptionsParameter } = options;
    return function queryOverloadRouter(...args) {
      return hasOptionsParameter ? routeComplexOverload(args, options) : routeSimpleOverload(args, options);
    };
  }
  function routeSimpleOverload(args, options) {
    if (args.length === 0) {
      return options.builderQueryFunction();
    }
    return options.typedQueryFunction(args[0]);
  }
  function routeComplexOverload(args, options) {
    switch (args.length) {
      case 0:
        return options.builderQueryFunction();
      case 1:
        return isCursorQuery(args[0]) || isQueryV2(args[0]) ? options.typedQueryFunction(args[0]) : options.builderQueryFunction(args[0]);
      default:
        return options.typedQueryFunction(args[0], args[1]);
    }
  }
  var init_query_method_router = __esm({
    "node_modules/@wix/sdk-runtime/build/query-method-router.js"() {
      init_query_type_guards();
    }
  });

  // node_modules/@wix/auto_sdk_members_badges-v-2/build/es/index.mjs
  var utils, onBadgeCreated, onBadgeDeleted, onBadgeUpdated, onBadgeCreated2, onBadgeDeleted2, onBadgeUpdated2;
  var init_es9 = __esm({
    "node_modules/@wix/auto_sdk_members_badges-v-2/build/es/index.mjs"() {
      init_rename_all_nested_keys();
      init_image();
      init_timestamp();
      init_transform_paths();
      init_browser2();
      init_query_builder_utils();
      init_event_definition_modules();
      utils = {
        query: {
          ...createQueryUtils()
        }
      };
      onBadgeCreated = EventDefinition(
        "wix.badges.v4.badge_created",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTImageToSDKImage,
              paths: [{ path: "entity.icon" }]
            },
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "entity.createdDate" },
                { path: "entity.updatedDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onBadgeDeleted = EventDefinition(
        "wix.badges.v4.badge_deleted",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTImageToSDKImage,
              paths: [{ path: "undefined.icon" }]
            },
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "undefined.createdDate" },
                { path: "undefined.updatedDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onBadgeUpdated = EventDefinition(
        "wix.badges.v4.badge_updated",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTImageToSDKImage,
              paths: [{ path: "entity.icon" }]
            },
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "entity.createdDate" },
                { path: "entity.updatedDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onBadgeCreated2 = createEventModule(onBadgeCreated);
      onBadgeDeleted2 = createEventModule(onBadgeDeleted);
      onBadgeUpdated2 = createEventModule(onBadgeUpdated);
    }
  });

  // node_modules/@wix/auto_sdk_members_badge-assignments/build/es/index.mjs
  var utils2, onBadgeAssignmentCreated, onBadgeAssignmentDeleted, onBadgeAssignmentCreated2, onBadgeAssignmentDeleted2;
  var init_es10 = __esm({
    "node_modules/@wix/auto_sdk_members_badge-assignments/build/es/index.mjs"() {
      init_rename_all_nested_keys();
      init_timestamp();
      init_transform_paths();
      init_browser2();
      init_query_builder_utils();
      init_event_definition_modules();
      utils2 = {
        query: {
          ...createQueryUtils()
        }
      };
      onBadgeAssignmentCreated = EventDefinition(
        "wix.badges.v4.badge_assignment_created",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "entity.createdDate" },
                { path: "entity.updatedDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onBadgeAssignmentDeleted = EventDefinition(
        "wix.badges.v4.badge_assignment_deleted",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "entity.createdDate" },
                { path: "entity.updatedDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onBadgeAssignmentCreated2 = createEventModule(
        onBadgeAssignmentCreated
      );
      onBadgeAssignmentDeleted2 = createEventModule(
        onBadgeAssignmentDeleted
      );
    }
  });

  // node_modules/@wix/auto_sdk_members_authentication/build/es/index.mjs
  var init_es11 = __esm({
    "node_modules/@wix/auto_sdk_members_authentication/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_members_members-about/build/es/index.mjs
  var utils3, onMemberAboutCreated, onMemberAboutDeleted, onMemberAboutUpdated, onMemberAboutCreated2, onMemberAboutDeleted2, onMemberAboutUpdated2;
  var init_es12 = __esm({
    "node_modules/@wix/auto_sdk_members_members-about/build/es/index.mjs"() {
      init_rename_all_nested_keys();
      init_float();
      init_timestamp();
      init_transform_paths();
      init_browser2();
      init_query_builder_utils();
      init_event_definition_modules();
      utils3 = {
        query: {
          ...createQueryUtils()
        }
      };
      onMemberAboutCreated = EventDefinition(
        "wix.members.about.v2.member_about_created",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTFloatToSDKFloat,
              paths: [
                {
                  path: "entity.content.nodes.buttonData.styles.background.gradient.centerX"
                },
                {
                  path: "entity.content.nodes.buttonData.styles.background.gradient.centerY"
                },
                {
                  path: "entity.content.nodes.buttonData.styles.background.gradient.stops.position"
                },
                {
                  path: "entity.content.nodes.buttonData.styles.backgroundHover.gradient.centerX"
                },
                {
                  path: "entity.content.nodes.buttonData.styles.backgroundHover.gradient.centerY"
                },
                {
                  path: "entity.content.nodes.buttonData.styles.backgroundHover.gradient.stops.position"
                },
                {
                  path: "entity.content.nodes.galleryData.items.image.media.duration"
                },
                {
                  path: "entity.content.nodes.galleryData.items.video.media.duration"
                },
                {
                  path: "entity.content.nodes.galleryData.items.video.thumbnail.duration"
                },
                { path: "entity.content.nodes.galleryData.options.item.ratio" },
                { path: "entity.content.nodes.imageData.image.duration" },
                { path: "entity.content.nodes.mapData.mapSettings.lat" },
                { path: "entity.content.nodes.mapData.mapSettings.lng" },
                { path: "entity.content.nodes.pollData.poll.image.duration" },
                {
                  path: "entity.content.nodes.pollData.poll.options.image.duration"
                },
                {
                  path: "entity.content.nodes.pollData.design.poll.background.image.duration"
                },
                { path: "entity.content.nodes.appEmbedData.image.duration" },
                { path: "entity.content.nodes.videoData.video.duration" },
                { path: "entity.content.nodes.videoData.thumbnail.duration" },
                { path: "entity.content.nodes.audioData.audio.duration" },
                { path: "entity.content.nodes.audioData.coverImage.duration" },
                {
                  path: "entity.content.nodes.layoutData.backgroundImage.media.duration"
                },
                {
                  path: "entity.content.nodes.layoutData.backdropImage.media.duration"
                },
                {
                  path: "entity.content.nodes.layoutData.background.gradient.centerX"
                },
                {
                  path: "entity.content.nodes.layoutData.background.gradient.centerY"
                },
                {
                  path: "entity.content.nodes.layoutData.background.gradient.stops.position"
                },
                {
                  path: "entity.content.nodes.layoutData.backdrop.gradient.centerX"
                },
                {
                  path: "entity.content.nodes.layoutData.backdrop.gradient.centerY"
                },
                {
                  path: "entity.content.nodes.layoutData.backdrop.gradient.stops.position"
                },
                { path: "entity.content.nodes.shapeData.shape.duration" },
                {
                  path: "entity.content.nodes.cardData.background.gradient.centerX"
                },
                {
                  path: "entity.content.nodes.cardData.background.gradient.centerY"
                },
                {
                  path: "entity.content.nodes.cardData.background.gradient.stops.position"
                },
                {
                  path: "entity.content.nodes.cardData.backgroundImage.media.duration"
                },
                { path: "entity.content.nodes.tocData.fontSize" },
                { path: "entity.content.nodes.tocData.itemSpacing" },
                { path: "entity.content.nodes.smartBlockCellData.shape.duration" }
              ]
            },
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "entity.content.metadata.createdTimestamp" },
                { path: "entity.content.metadata.updatedTimestamp" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onMemberAboutDeleted = EventDefinition(
        "wix.members.about.v2.member_about_deleted",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTFloatToSDKFloat,
              paths: [
                {
                  path: "undefined.content.nodes.buttonData.styles.background.gradient.centerX"
                },
                {
                  path: "undefined.content.nodes.buttonData.styles.background.gradient.centerY"
                },
                {
                  path: "undefined.content.nodes.buttonData.styles.background.gradient.stops.position"
                },
                {
                  path: "undefined.content.nodes.buttonData.styles.backgroundHover.gradient.centerX"
                },
                {
                  path: "undefined.content.nodes.buttonData.styles.backgroundHover.gradient.centerY"
                },
                {
                  path: "undefined.content.nodes.buttonData.styles.backgroundHover.gradient.stops.position"
                },
                {
                  path: "undefined.content.nodes.galleryData.items.image.media.duration"
                },
                {
                  path: "undefined.content.nodes.galleryData.items.video.media.duration"
                },
                {
                  path: "undefined.content.nodes.galleryData.items.video.thumbnail.duration"
                },
                { path: "undefined.content.nodes.galleryData.options.item.ratio" },
                { path: "undefined.content.nodes.imageData.image.duration" },
                { path: "undefined.content.nodes.mapData.mapSettings.lat" },
                { path: "undefined.content.nodes.mapData.mapSettings.lng" },
                { path: "undefined.content.nodes.pollData.poll.image.duration" },
                {
                  path: "undefined.content.nodes.pollData.poll.options.image.duration"
                },
                {
                  path: "undefined.content.nodes.pollData.design.poll.background.image.duration"
                },
                { path: "undefined.content.nodes.appEmbedData.image.duration" },
                { path: "undefined.content.nodes.videoData.video.duration" },
                { path: "undefined.content.nodes.videoData.thumbnail.duration" },
                { path: "undefined.content.nodes.audioData.audio.duration" },
                { path: "undefined.content.nodes.audioData.coverImage.duration" },
                {
                  path: "undefined.content.nodes.layoutData.backgroundImage.media.duration"
                },
                {
                  path: "undefined.content.nodes.layoutData.backdropImage.media.duration"
                },
                {
                  path: "undefined.content.nodes.layoutData.background.gradient.centerX"
                },
                {
                  path: "undefined.content.nodes.layoutData.background.gradient.centerY"
                },
                {
                  path: "undefined.content.nodes.layoutData.background.gradient.stops.position"
                },
                {
                  path: "undefined.content.nodes.layoutData.backdrop.gradient.centerX"
                },
                {
                  path: "undefined.content.nodes.layoutData.backdrop.gradient.centerY"
                },
                {
                  path: "undefined.content.nodes.layoutData.backdrop.gradient.stops.position"
                },
                { path: "undefined.content.nodes.shapeData.shape.duration" },
                {
                  path: "undefined.content.nodes.cardData.background.gradient.centerX"
                },
                {
                  path: "undefined.content.nodes.cardData.background.gradient.centerY"
                },
                {
                  path: "undefined.content.nodes.cardData.background.gradient.stops.position"
                },
                {
                  path: "undefined.content.nodes.cardData.backgroundImage.media.duration"
                },
                { path: "undefined.content.nodes.tocData.fontSize" },
                { path: "undefined.content.nodes.tocData.itemSpacing" },
                {
                  path: "undefined.content.nodes.smartBlockCellData.shape.duration"
                }
              ]
            },
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "undefined.content.metadata.createdTimestamp" },
                { path: "undefined.content.metadata.updatedTimestamp" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onMemberAboutUpdated = EventDefinition(
        "wix.members.about.v2.member_about_updated",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTFloatToSDKFloat,
              paths: [
                {
                  path: "entity.content.nodes.buttonData.styles.background.gradient.centerX"
                },
                {
                  path: "entity.content.nodes.buttonData.styles.background.gradient.centerY"
                },
                {
                  path: "entity.content.nodes.buttonData.styles.background.gradient.stops.position"
                },
                {
                  path: "entity.content.nodes.buttonData.styles.backgroundHover.gradient.centerX"
                },
                {
                  path: "entity.content.nodes.buttonData.styles.backgroundHover.gradient.centerY"
                },
                {
                  path: "entity.content.nodes.buttonData.styles.backgroundHover.gradient.stops.position"
                },
                {
                  path: "entity.content.nodes.galleryData.items.image.media.duration"
                },
                {
                  path: "entity.content.nodes.galleryData.items.video.media.duration"
                },
                {
                  path: "entity.content.nodes.galleryData.items.video.thumbnail.duration"
                },
                { path: "entity.content.nodes.galleryData.options.item.ratio" },
                { path: "entity.content.nodes.imageData.image.duration" },
                { path: "entity.content.nodes.mapData.mapSettings.lat" },
                { path: "entity.content.nodes.mapData.mapSettings.lng" },
                { path: "entity.content.nodes.pollData.poll.image.duration" },
                {
                  path: "entity.content.nodes.pollData.poll.options.image.duration"
                },
                {
                  path: "entity.content.nodes.pollData.design.poll.background.image.duration"
                },
                { path: "entity.content.nodes.appEmbedData.image.duration" },
                { path: "entity.content.nodes.videoData.video.duration" },
                { path: "entity.content.nodes.videoData.thumbnail.duration" },
                { path: "entity.content.nodes.audioData.audio.duration" },
                { path: "entity.content.nodes.audioData.coverImage.duration" },
                {
                  path: "entity.content.nodes.layoutData.backgroundImage.media.duration"
                },
                {
                  path: "entity.content.nodes.layoutData.backdropImage.media.duration"
                },
                {
                  path: "entity.content.nodes.layoutData.background.gradient.centerX"
                },
                {
                  path: "entity.content.nodes.layoutData.background.gradient.centerY"
                },
                {
                  path: "entity.content.nodes.layoutData.background.gradient.stops.position"
                },
                {
                  path: "entity.content.nodes.layoutData.backdrop.gradient.centerX"
                },
                {
                  path: "entity.content.nodes.layoutData.backdrop.gradient.centerY"
                },
                {
                  path: "entity.content.nodes.layoutData.backdrop.gradient.stops.position"
                },
                { path: "entity.content.nodes.shapeData.shape.duration" },
                {
                  path: "entity.content.nodes.cardData.background.gradient.centerX"
                },
                {
                  path: "entity.content.nodes.cardData.background.gradient.centerY"
                },
                {
                  path: "entity.content.nodes.cardData.background.gradient.stops.position"
                },
                {
                  path: "entity.content.nodes.cardData.backgroundImage.media.duration"
                },
                { path: "entity.content.nodes.tocData.fontSize" },
                { path: "entity.content.nodes.tocData.itemSpacing" },
                { path: "entity.content.nodes.smartBlockCellData.shape.duration" }
              ]
            },
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "entity.content.metadata.createdTimestamp" },
                { path: "entity.content.metadata.updatedTimestamp" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onMemberAboutCreated2 = createEventModule(
        onMemberAboutCreated
      );
      onMemberAboutDeleted2 = createEventModule(
        onMemberAboutDeleted
      );
      onMemberAboutUpdated2 = createEventModule(
        onMemberAboutUpdated
      );
    }
  });

  // node_modules/@wix/auto_sdk_members_user-member/build/es/index.mjs
  var utils4;
  var init_es13 = __esm({
    "node_modules/@wix/auto_sdk_members_user-member/build/es/index.mjs"() {
      init_query_builder_utils();
      utils4 = {
        query: {
          ...createQueryUtils()
        }
      };
    }
  });

  // node_modules/@wix/auto_sdk_members_custom-fields/build/es/index.mjs
  var init_es14 = __esm({
    "node_modules/@wix/auto_sdk_members_custom-fields/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_members_custom-field-applications/build/es/index.mjs
  var init_es15 = __esm({
    "node_modules/@wix/auto_sdk_members_custom-field-applications/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_members_custom-field-suggestions/build/es/index.mjs
  var utils5;
  var init_es16 = __esm({
    "node_modules/@wix/auto_sdk_members_custom-field-suggestions/build/es/index.mjs"() {
      init_query_builder_utils();
      utils5 = {
        query: {
          ...createQueryUtils()
        }
      };
    }
  });

  // node_modules/@wix/auto_sdk_members_default-privacy/build/es/index.mjs
  var init_es17 = __esm({
    "node_modules/@wix/auto_sdk_members_default-privacy/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_members_members/build/es/index.mjs
  var es_exports6 = {};
  __export(es_exports6, {
    ActivityStatusStatus: () => ActivityStatusStatus,
    DeleteStatus: () => DeleteStatus,
    Namespace: () => Namespace,
    PrivacyStatusStatus: () => PrivacyStatusStatus,
    Set: () => Set,
    SiteCreatedContext: () => SiteCreatedContext,
    SortOrder: () => SortOrder,
    State: () => State,
    Status: () => Status,
    WebhookIdentityType: () => WebhookIdentityType,
    approveMember: () => approveMember4,
    blockMember: () => blockMember4,
    bulkApproveMembers: () => bulkApproveMembers4,
    bulkBlockMembers: () => bulkBlockMembers4,
    bulkDeleteMembers: () => bulkDeleteMembers4,
    bulkDeleteMembersByFilter: () => bulkDeleteMembersByFilter4,
    createMember: () => createMember4,
    deleteMember: () => deleteMember4,
    deleteMemberAddresses: () => deleteMemberAddresses4,
    deleteMemberEmails: () => deleteMemberEmails4,
    deleteMemberPhones: () => deleteMemberPhones4,
    deleteMyMember: () => deleteMyMember4,
    disconnectMember: () => disconnectMember4,
    getCurrentMember: () => getCurrentMember3,
    getMember: () => getMember4,
    joinCommunity: () => joinCommunity4,
    leaveCommunity: () => leaveCommunity4,
    listMembers: () => listMembers4,
    muteMember: () => muteMember4,
    onMemberCreated: () => onMemberCreated2,
    onMemberDeleted: () => onMemberDeleted2,
    onMemberUpdated: () => onMemberUpdated2,
    queryMembers: () => queryMembers4,
    unmuteMember: () => unmuteMember4,
    updateCurrentMemberSlug: () => updateCurrentMemberSlug3,
    updateMember: () => updateMember4,
    updateMemberSlug: () => updateMemberSlug4,
    utils: () => utils6
  });
  function resolveComWixpressMembersApiMembersUrl(opts) {
    const domainToMappings = {
      "www.wixapis.com": [
        {
          srcPath: "/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "api._api_base_domain_": [
        {
          srcPath: "/members-ng-api",
          destPath: ""
        }
      ],
      "www._base_domain_": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "manage._base_domain_": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "editor._base_domain_": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "blocks._base_domain_": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "create.editorx": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "editor.wixapps.net": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "*.dev.wix-code.com": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "bo._base_domain_": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "wixbo.ai": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "wix-bo.com": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      _: [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ],
      "members.wixapps.net": [
        {
          srcPath: "/_api/members/v1/members",
          destPath: "/v1/members"
        }
      ]
    };
    return resolveUrl(Object.assign(opts, { domainToMappings }));
  }
  function updateMySlug(payload) {
    function __updateMySlug({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.UpdateMySlug",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/my/slug",
          data: payload,
          host
        }),
        data: payload,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __updateMySlug;
  }
  function updateMemberSlug(payload) {
    function __updateMemberSlug({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.UpdateMemberSlug",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}/slug",
          data: payload,
          host
        }),
        data: payload,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __updateMemberSlug;
  }
  function joinCommunity(payload) {
    function __joinCommunity({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.JoinCommunity",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/join-community",
          data: payload,
          host
        }),
        data: payload,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __joinCommunity;
  }
  function leaveCommunity(payload) {
    function __leaveCommunity({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.LeaveCommunity",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/leave-community",
          data: payload,
          host
        }),
        data: payload,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __leaveCommunity;
  }
  function getMyMember(payload) {
    function __getMyMember({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "GET",
        methodFqn: "com.wixpress.members.api.Members.GetMyMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/my",
          data: payload,
          host
        }),
        params: toURLSearchParams(payload),
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __getMyMember;
  }
  function getMember(payload) {
    function __getMember({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "GET",
        methodFqn: "com.wixpress.members.api.Members.GetMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}",
          data: payload,
          host
        }),
        params: toURLSearchParams(payload),
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __getMember;
  }
  function listMembers(payload) {
    function __listMembers({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "GET",
        methodFqn: "com.wixpress.members.api.Members.ListMembers",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members",
          data: payload,
          host
        }),
        params: toURLSearchParams(payload, true),
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "members.createdDate" },
              { path: "members.updatedDate" },
              { path: "members.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __listMembers;
  }
  function queryMembers(payload) {
    function __queryMembers({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.QueryMembers",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/query",
          data: payload,
          host
        }),
        data: payload,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "members.createdDate" },
              { path: "members.updatedDate" },
              { path: "members.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __queryMembers;
  }
  function muteMember(payload) {
    function __muteMember({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.MuteMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}/mute",
          data: payload,
          host
        }),
        data: payload,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __muteMember;
  }
  function unmuteMember(payload) {
    function __unmuteMember({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.UnmuteMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}/unmute",
          data: payload,
          host
        }),
        data: payload,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __unmuteMember;
  }
  function approveMember(payload) {
    function __approveMember({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.ApproveMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}/approve",
          data: payload,
          host
        }),
        data: payload,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __approveMember;
  }
  function blockMember(payload) {
    function __blockMember({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.BlockMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}/block",
          data: payload,
          host
        }),
        data: payload,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __blockMember;
  }
  function disconnectMember(payload) {
    function __disconnectMember({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.DisconnectMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}/disconnect",
          data: payload,
          host
        }),
        data: payload,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __disconnectMember;
  }
  function deleteMember(payload) {
    function __deleteMember({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "DELETE",
        methodFqn: "com.wixpress.members.api.Members.DeleteMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}",
          data: payload,
          host
        }),
        params: toURLSearchParams(payload)
      };
      return metadata;
    }
    return __deleteMember;
  }
  function deleteMyMember(payload) {
    function __deleteMyMember({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "DELETE",
        methodFqn: "com.wixpress.members.api.Members.DeleteMyMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/my",
          data: payload,
          host
        }),
        params: toURLSearchParams(payload)
      };
      return metadata;
    }
    return __deleteMyMember;
  }
  function bulkDeleteMembers(payload) {
    function __bulkDeleteMembers({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.BulkDeleteMembers",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/bulk/delete",
          data: payload,
          host
        }),
        data: payload
      };
      return metadata;
    }
    return __bulkDeleteMembers;
  }
  function bulkDeleteMembersByFilter(payload) {
    function __bulkDeleteMembersByFilter({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.BulkDeleteMembersByFilter",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/bulk/delete-by-filter",
          data: payload,
          host
        }),
        data: payload
      };
      return metadata;
    }
    return __bulkDeleteMembersByFilter;
  }
  function bulkApproveMembers(payload) {
    function __bulkApproveMembers({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.BulkApproveMembers",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/bulk/approve-by-filter",
          data: payload,
          host
        }),
        data: payload
      };
      return metadata;
    }
    return __bulkApproveMembers;
  }
  function bulkBlockMembers(payload) {
    function __bulkBlockMembers({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.BulkBlockMembers",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/bulk/block-by-filter",
          data: payload,
          host
        }),
        data: payload
      };
      return metadata;
    }
    return __bulkBlockMembers;
  }
  function createMember(payload) {
    function __createMember({ host }) {
      const serializedData = transformPaths(payload, [
        {
          transformFn: transformSDKTimestampToRESTTimestamp,
          paths: [
            { path: "member.createdDate" },
            { path: "member.updatedDate" },
            { path: "member.lastLoginDate" }
          ]
        }
      ]);
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "POST",
        methodFqn: "com.wixpress.members.api.Members.CreateMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members",
          data: serializedData,
          host
        }),
        data: serializedData,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __createMember;
  }
  function updateMember(payload) {
    function __updateMember({ host }) {
      const serializedData = transformPaths(payload, [
        {
          transformFn: transformSDKTimestampToRESTTimestamp,
          paths: [
            { path: "member.createdDate" },
            { path: "member.updatedDate" },
            { path: "member.lastLoginDate" }
          ]
        }
      ]);
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "PATCH",
        methodFqn: "com.wixpress.members.api.Members.UpdateMember",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{member.id}",
          data: serializedData,
          host
        }),
        data: serializedData,
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __updateMember;
  }
  function deleteMemberPhones(payload) {
    function __deleteMemberPhones({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "DELETE",
        methodFqn: "com.wixpress.members.api.Members.DeleteMemberPhones",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}/phones",
          data: payload,
          host
        }),
        params: toURLSearchParams(payload),
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __deleteMemberPhones;
  }
  function deleteMemberEmails(payload) {
    function __deleteMemberEmails({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "DELETE",
        methodFqn: "com.wixpress.members.api.Members.DeleteMemberEmails",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}/emails",
          data: payload,
          host
        }),
        params: toURLSearchParams(payload),
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __deleteMemberEmails;
  }
  function deleteMemberAddresses(payload) {
    function __deleteMemberAddresses({ host }) {
      const metadata = {
        entityFqdn: "wix.members.v1.member",
        method: "DELETE",
        methodFqn: "com.wixpress.members.api.Members.DeleteMemberAddresses",
        packageName: PACKAGE_NAME,
        migrationOptions: {
          optInTransformResponse: true
        },
        url: resolveComWixpressMembersApiMembersUrl({
          protoPath: "/v1/members/{id}/addresses",
          data: payload,
          host
        }),
        params: toURLSearchParams(payload),
        transformResponse: (payload2) => transformPaths(payload2, [
          {
            transformFn: transformRESTTimestampToSDKTimestamp,
            paths: [
              { path: "member.createdDate" },
              { path: "member.updatedDate" },
              { path: "member.lastLoginDate" }
            ]
          }
        ])
      };
      return metadata;
    }
    return __deleteMemberAddresses;
  }
  async function updateCurrentMemberSlug(slug) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ slug });
    const reqOpts = updateMySlug(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { slug: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["slug"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function updateMemberSlug2(_id, slug) {
    const { httpClient, sideEffects } = arguments[2];
    const payload = renameKeysFromSDKRequestToRESTRequest({
      id: _id,
      slug
    });
    const reqOpts = updateMemberSlug(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]", slug: "$[1]" },
          singleArgumentUnchanged: false
        },
        ["_id", "slug"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function joinCommunity2() {
    const { httpClient, sideEffects } = arguments[0];
    const payload = renameKeysFromSDKRequestToRESTRequest({});
    const reqOpts = joinCommunity(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: {},
          singleArgumentUnchanged: false
        },
        []
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function leaveCommunity2() {
    const { httpClient, sideEffects } = arguments[0];
    const payload = renameKeysFromSDKRequestToRESTRequest({});
    const reqOpts = leaveCommunity(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: {},
          singleArgumentUnchanged: false
        },
        []
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function getCurrentMember(options) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({
      fieldsets: options?.fieldsets
    });
    const reqOpts = getMyMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { fieldsets: "$[0].fieldsets" },
          singleArgumentUnchanged: false
        },
        ["options"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function getMember2(_id, options) {
    const { httpClient, sideEffects } = arguments[2];
    const payload = renameKeysFromSDKRequestToRESTRequest({
      id: _id,
      fieldsets: options?.fieldsets
    });
    const reqOpts = getMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data)?.member;
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]", fieldsets: "$[1].fieldsets" },
          singleArgumentUnchanged: false
        },
        ["_id", "options"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function listMembers2(options) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({
      paging: options?.paging,
      fieldsets: options?.fieldsets,
      sorting: options?.sorting
    });
    const reqOpts = listMembers(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: {
            paging: "$[0].paging",
            fieldsets: "$[0].fieldsets",
            sorting: "$[0].sorting"
          },
          singleArgumentUnchanged: false
        },
        ["options"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  function queryMembers2(options) {
    const { httpClient, sideEffects } = arguments[1];
    return queryBuilder({
      func: async (payload) => {
        const reqOpts = queryMembers({
          ...payload,
          ...options ?? {}
        });
        sideEffects?.onSiteCall?.();
        try {
          const result = await httpClient.request(reqOpts);
          sideEffects?.onSuccess?.(result);
          return result;
        } catch (err) {
          sideEffects?.onError?.(err);
          throw err;
        }
      },
      requestTransformer: (query) => {
        const args = [query, options];
        return renameKeysFromSDKRequestToRESTRequest({
          ...args?.[1],
          query: args?.[0]
        });
      },
      responseTransformer: ({ data }) => {
        const transformedData = renameKeysFromRESTResponseToSDKResponse(
          transformPaths(data, [])
        );
        return {
          items: transformedData?.members,
          pagingMetadata: transformedData?.metadata
        };
      },
      errorTransformer: (err) => {
        const transformedError = transformError(err, {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { query: "$[0]" },
          singleArgumentUnchanged: false
        });
        throw transformedError;
      },
      pagingMethod: "OFFSET",
      transformationPaths: {}
    });
  }
  async function typedQueryMembers(query, options) {
    const { httpClient, sideEffects } = arguments[2];
    const payload = renameKeysFromSDKRequestToRESTRequest({
      query,
      ...options
    });
    const reqOpts = queryMembers(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { query: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["query", "options"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function muteMember2(_id) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ id: _id });
    const reqOpts = muteMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["_id"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function unmuteMember2(_id) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ id: _id });
    const reqOpts = unmuteMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["_id"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function approveMember2(_id) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ id: _id });
    const reqOpts = approveMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["_id"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function blockMember2(_id) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ id: _id });
    const reqOpts = blockMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["_id"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function disconnectMember2(_id) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ id: _id });
    const reqOpts = disconnectMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["_id"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function deleteMember2(_id) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ id: _id });
    const reqOpts = deleteMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["_id"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function deleteMyMember2(options) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({
      contentAssigneeId: options?.contentAssigneeId
    });
    const reqOpts = deleteMyMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: {
            contentAssigneeId: "$[0].contentAssigneeId"
          },
          singleArgumentUnchanged: false
        },
        ["options"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function bulkDeleteMembers2(memberIds) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({
      memberIds
    });
    const reqOpts = bulkDeleteMembers(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { memberIds: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["memberIds"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function bulkDeleteMembersByFilter2(filter, options) {
    const { httpClient, sideEffects } = arguments[2];
    const payload = renameKeysFromSDKRequestToRESTRequest({
      filter,
      contentAssigneeId: options?.contentAssigneeId,
      search: options?.search
    });
    const reqOpts = bulkDeleteMembersByFilter(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: {
            filter: "$[0]",
            contentAssigneeId: "$[1].contentAssigneeId",
            search: "$[1].search"
          },
          singleArgumentUnchanged: false
        },
        ["filter", "options"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function bulkApproveMembers2(filter) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ filter });
    const reqOpts = bulkApproveMembers(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { filter: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["filter"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function bulkBlockMembers2(filter) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ filter });
    const reqOpts = bulkBlockMembers(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { filter: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["filter"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function createMember2(options) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({
      member: options?.member
    });
    const reqOpts = createMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data)?.member;
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { member: "$[0].member" },
          singleArgumentUnchanged: false
        },
        ["options"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function updateMember2(_id, member) {
    const { httpClient, sideEffects } = arguments[2];
    const payload = renameKeysFromSDKRequestToRESTRequest({
      member: { ...member, id: _id }
    });
    const reqOpts = updateMember(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data)?.member;
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: { member: "$[1]" },
          explicitPathsToArguments: { "member.id": "$[0]" },
          singleArgumentUnchanged: false
        },
        ["_id", "member"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function deleteMemberPhones2(_id) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ id: _id });
    const reqOpts = deleteMemberPhones(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["_id"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function deleteMemberEmails2(_id) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ id: _id });
    const reqOpts = deleteMemberEmails(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["_id"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  async function deleteMemberAddresses2(_id) {
    const { httpClient, sideEffects } = arguments[1];
    const payload = renameKeysFromSDKRequestToRESTRequest({ id: _id });
    const reqOpts = deleteMemberAddresses(payload);
    sideEffects?.onSiteCall?.();
    try {
      const result = await httpClient.request(reqOpts);
      sideEffects?.onSuccess?.(result);
      return renameKeysFromRESTResponseToSDKResponse(result.data);
    } catch (err) {
      const transformedError = transformError(
        err,
        {
          spreadPathsToArguments: {},
          explicitPathsToArguments: { id: "$[0]" },
          singleArgumentUnchanged: false
        },
        ["_id"]
      );
      sideEffects?.onError?.(err);
      throw transformedError;
    }
  }
  function updateCurrentMemberSlug2(httpClient) {
    return (slug) => updateCurrentMemberSlug(
      slug,
      // @ts-ignore
      { httpClient }
    );
  }
  function updateMemberSlug3(httpClient) {
    return (_id, slug) => updateMemberSlug2(
      _id,
      slug,
      // @ts-ignore
      { httpClient }
    );
  }
  function joinCommunity3(httpClient) {
    return () => joinCommunity2(
      // @ts-ignore
      { httpClient }
    );
  }
  function leaveCommunity3(httpClient) {
    return () => leaveCommunity2(
      // @ts-ignore
      { httpClient }
    );
  }
  function getCurrentMember2(httpClient) {
    return (options) => getCurrentMember(
      options,
      // @ts-ignore
      { httpClient }
    );
  }
  function getMember3(httpClient) {
    return (_id, options) => getMember2(
      _id,
      options,
      // @ts-ignore
      { httpClient }
    );
  }
  function listMembers3(httpClient) {
    return (options) => listMembers2(
      options,
      // @ts-ignore
      { httpClient }
    );
  }
  function queryMembers3(httpClient) {
    return (options) => queryMembers2(
      options,
      // @ts-ignore
      { httpClient }
    );
  }
  function typedQueryMembers2(httpClient) {
    return (query, options) => typedQueryMembers(
      query,
      options,
      // @ts-ignore
      { httpClient }
    );
  }
  function muteMember3(httpClient) {
    return (_id) => muteMember2(
      _id,
      // @ts-ignore
      { httpClient }
    );
  }
  function unmuteMember3(httpClient) {
    return (_id) => unmuteMember2(
      _id,
      // @ts-ignore
      { httpClient }
    );
  }
  function approveMember3(httpClient) {
    return (_id) => approveMember2(
      _id,
      // @ts-ignore
      { httpClient }
    );
  }
  function blockMember3(httpClient) {
    return (_id) => blockMember2(
      _id,
      // @ts-ignore
      { httpClient }
    );
  }
  function disconnectMember3(httpClient) {
    return (_id) => disconnectMember2(
      _id,
      // @ts-ignore
      { httpClient }
    );
  }
  function deleteMember3(httpClient) {
    return (_id) => deleteMember2(
      _id,
      // @ts-ignore
      { httpClient }
    );
  }
  function deleteMyMember3(httpClient) {
    return (options) => deleteMyMember2(
      options,
      // @ts-ignore
      { httpClient }
    );
  }
  function bulkDeleteMembers3(httpClient) {
    return (memberIds) => bulkDeleteMembers2(
      memberIds,
      // @ts-ignore
      { httpClient }
    );
  }
  function bulkDeleteMembersByFilter3(httpClient) {
    return (filter, options) => bulkDeleteMembersByFilter2(
      filter,
      options,
      // @ts-ignore
      { httpClient }
    );
  }
  function bulkApproveMembers3(httpClient) {
    return (filter) => bulkApproveMembers2(
      filter,
      // @ts-ignore
      { httpClient }
    );
  }
  function bulkBlockMembers3(httpClient) {
    return (filter) => bulkBlockMembers2(
      filter,
      // @ts-ignore
      { httpClient }
    );
  }
  function createMember3(httpClient) {
    return (options) => createMember2(
      options,
      // @ts-ignore
      { httpClient }
    );
  }
  function updateMember3(httpClient) {
    return (_id, member) => updateMember2(
      _id,
      member,
      // @ts-ignore
      { httpClient }
    );
  }
  function deleteMemberPhones3(httpClient) {
    return (_id) => deleteMemberPhones2(
      _id,
      // @ts-ignore
      { httpClient }
    );
  }
  function deleteMemberEmails3(httpClient) {
    return (_id) => deleteMemberEmails2(
      _id,
      // @ts-ignore
      { httpClient }
    );
  }
  function deleteMemberAddresses3(httpClient) {
    return (_id) => deleteMemberAddresses2(
      _id,
      // @ts-ignore
      { httpClient }
    );
  }
  function customQueryMembers(httpClient) {
    const router = createQueryOverloadRouter({
      builderQueryFunction: (options) => queryMembers3(httpClient)(options),
      typedQueryFunction: (query, options) => typedQueryMembers2(httpClient)(query, options),
      hasOptionsParameter: true
    });
    function overloadedQuery(queryOrOptions, options) {
      return router(...arguments);
    }
    return overloadedQuery;
  }
  var PACKAGE_NAME, Status, PrivacyStatusStatus, ActivityStatusStatus, Set, SortOrder, State, SiteCreatedContext, Namespace, DeleteStatus, WebhookIdentityType, utils6, onMemberCreated, onMemberDeleted, onMemberUpdated, updateCurrentMemberSlug3, updateMemberSlug4, joinCommunity4, leaveCommunity4, getCurrentMember3, getMember4, listMembers4, muteMember4, unmuteMember4, approveMember4, blockMember4, disconnectMember4, deleteMember4, deleteMyMember4, bulkDeleteMembers4, bulkDeleteMembersByFilter4, bulkApproveMembers4, bulkBlockMembers4, createMember4, updateMember4, deleteMemberPhones4, deleteMemberEmails4, deleteMemberAddresses4, queryMembers4, onMemberCreated2, onMemberDeleted2, onMemberUpdated2;
  var init_es18 = __esm({
    "node_modules/@wix/auto_sdk_members_members/build/es/index.mjs"() {
      init_rename_all_nested_keys();
      init_timestamp();
      init_transform_paths();
      init_browser2();
      init_transform_error();
      init_query_builder();
      init_rename_all_nested_keys();
      init_rest_modules2();
      init_timestamp();
      init_timestamp();
      init_transform_paths();
      init_rest_modules2();
      init_transform_paths();
      init_query_builder_utils();
      init_rest_modules2();
      init_event_definition_modules();
      init_query_method_router();
      PACKAGE_NAME = "@wix/auto_sdk_members_members";
      Status = /* @__PURE__ */ ((Status2) => {
        Status2["UNKNOWN"] = "UNKNOWN";
        Status2["PENDING"] = "PENDING";
        Status2["APPROVED"] = "APPROVED";
        Status2["BLOCKED"] = "BLOCKED";
        Status2["OFFLINE"] = "OFFLINE";
        return Status2;
      })(Status || {});
      PrivacyStatusStatus = /* @__PURE__ */ ((PrivacyStatusStatus2) => {
        PrivacyStatusStatus2["UNKNOWN"] = "UNKNOWN";
        PrivacyStatusStatus2["PRIVATE"] = "PRIVATE";
        PrivacyStatusStatus2["PUBLIC"] = "PUBLIC";
        return PrivacyStatusStatus2;
      })(PrivacyStatusStatus || {});
      ActivityStatusStatus = /* @__PURE__ */ ((ActivityStatusStatus2) => {
        ActivityStatusStatus2["UNKNOWN"] = "UNKNOWN";
        ActivityStatusStatus2["ACTIVE"] = "ACTIVE";
        ActivityStatusStatus2["MUTED"] = "MUTED";
        return ActivityStatusStatus2;
      })(ActivityStatusStatus || {});
      Set = /* @__PURE__ */ ((Set2) => {
        Set2["PUBLIC"] = "PUBLIC";
        Set2["EXTENDED"] = "EXTENDED";
        Set2["FULL"] = "FULL";
        return Set2;
      })(Set || {});
      SortOrder = /* @__PURE__ */ ((SortOrder2) => {
        SortOrder2["ASC"] = "ASC";
        SortOrder2["DESC"] = "DESC";
        return SortOrder2;
      })(SortOrder || {});
      State = /* @__PURE__ */ ((State2) => {
        State2["UNKNOWN"] = "UNKNOWN";
        State2["ENABLED"] = "ENABLED";
        State2["DISABLED"] = "DISABLED";
        State2["PENDING"] = "PENDING";
        State2["DEMO"] = "DEMO";
        return State2;
      })(State || {});
      SiteCreatedContext = /* @__PURE__ */ ((SiteCreatedContext2) => {
        SiteCreatedContext2["OTHER"] = "OTHER";
        SiteCreatedContext2["FROM_TEMPLATE"] = "FROM_TEMPLATE";
        SiteCreatedContext2["DUPLICATE_BY_SITE_TRANSFER"] = "DUPLICATE_BY_SITE_TRANSFER";
        SiteCreatedContext2["DUPLICATE"] = "DUPLICATE";
        SiteCreatedContext2["OLD_SITE_TRANSFER"] = "OLD_SITE_TRANSFER";
        SiteCreatedContext2["FLASH"] = "FLASH";
        return SiteCreatedContext2;
      })(SiteCreatedContext || {});
      Namespace = /* @__PURE__ */ ((Namespace2) => {
        Namespace2["UNKNOWN_NAMESPACE"] = "UNKNOWN_NAMESPACE";
        Namespace2["WIX"] = "WIX";
        Namespace2["SHOUT_OUT"] = "SHOUT_OUT";
        Namespace2["ALBUMS"] = "ALBUMS";
        Namespace2["WIX_STORES_TEST_DRIVE"] = "WIX_STORES_TEST_DRIVE";
        Namespace2["HOTELS"] = "HOTELS";
        Namespace2["CLUBS"] = "CLUBS";
        Namespace2["ONBOARDING_DRAFT"] = "ONBOARDING_DRAFT";
        Namespace2["DEV_SITE"] = "DEV_SITE";
        Namespace2["LOGOS"] = "LOGOS";
        Namespace2["VIDEO_MAKER"] = "VIDEO_MAKER";
        Namespace2["PARTNER_DASHBOARD"] = "PARTNER_DASHBOARD";
        Namespace2["DEV_CENTER_COMPANY"] = "DEV_CENTER_COMPANY";
        Namespace2["HTML_DRAFT"] = "HTML_DRAFT";
        Namespace2["SITELESS_BUSINESS"] = "SITELESS_BUSINESS";
        Namespace2["CREATOR_ECONOMY"] = "CREATOR_ECONOMY";
        Namespace2["DASHBOARD_FIRST"] = "DASHBOARD_FIRST";
        Namespace2["ANYWHERE"] = "ANYWHERE";
        Namespace2["HEADLESS"] = "HEADLESS";
        Namespace2["ACCOUNT_MASTER_CMS"] = "ACCOUNT_MASTER_CMS";
        Namespace2["RISE"] = "RISE";
        Namespace2["BRANDED_FIRST"] = "BRANDED_FIRST";
        Namespace2["NOWNIA"] = "NOWNIA";
        Namespace2["UGC_TEMPLATE"] = "UGC_TEMPLATE";
        Namespace2["CODUX"] = "CODUX";
        Namespace2["MEDIA_DESIGN_CREATOR"] = "MEDIA_DESIGN_CREATOR";
        Namespace2["SHARED_BLOG_ENTERPRISE"] = "SHARED_BLOG_ENTERPRISE";
        Namespace2["STANDALONE_FORMS"] = "STANDALONE_FORMS";
        Namespace2["STANDALONE_EVENTS"] = "STANDALONE_EVENTS";
        Namespace2["MIMIR"] = "MIMIR";
        Namespace2["TWINS"] = "TWINS";
        Namespace2["NANO"] = "NANO";
        Namespace2["BASE44"] = "BASE44";
        Namespace2["CHANNELS"] = "CHANNELS";
        Namespace2["NAUTILUS"] = "NAUTILUS";
        return Namespace2;
      })(Namespace || {});
      DeleteStatus = /* @__PURE__ */ ((DeleteStatus2) => {
        DeleteStatus2["UNKNOWN"] = "UNKNOWN";
        DeleteStatus2["TRASH"] = "TRASH";
        DeleteStatus2["DELETED"] = "DELETED";
        DeleteStatus2["PENDING_PURGE"] = "PENDING_PURGE";
        DeleteStatus2["PURGED_EXTERNALLY"] = "PURGED_EXTERNALLY";
        return DeleteStatus2;
      })(DeleteStatus || {});
      WebhookIdentityType = /* @__PURE__ */ ((WebhookIdentityType2) => {
        WebhookIdentityType2["UNKNOWN"] = "UNKNOWN";
        WebhookIdentityType2["ANONYMOUS_VISITOR"] = "ANONYMOUS_VISITOR";
        WebhookIdentityType2["MEMBER"] = "MEMBER";
        WebhookIdentityType2["WIX_USER"] = "WIX_USER";
        WebhookIdentityType2["APP"] = "APP";
        return WebhookIdentityType2;
      })(WebhookIdentityType || {});
      utils6 = {
        query: {
          ...createQueryUtils()
        }
      };
      onMemberCreated = EventDefinition(
        "wix.members.v1.member_created",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "entity.createdDate" },
                { path: "entity.updatedDate" },
                { path: "entity.lastLoginDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onMemberDeleted = EventDefinition(
        "wix.members.v1.member_deleted",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "undefined.createdDate" },
                { path: "undefined.updatedDate" },
                { path: "undefined.lastLoginDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onMemberUpdated = EventDefinition(
        "wix.members.v1.member_updated",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "entity.createdDate" },
                { path: "entity.updatedDate" },
                { path: "entity.lastLoginDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      updateCurrentMemberSlug3 = /* @__PURE__ */ createRESTModule(updateCurrentMemberSlug2);
      updateMemberSlug4 = /* @__PURE__ */ createRESTModule(updateMemberSlug3);
      joinCommunity4 = /* @__PURE__ */ createRESTModule(joinCommunity3);
      leaveCommunity4 = /* @__PURE__ */ createRESTModule(leaveCommunity3);
      getCurrentMember3 = /* @__PURE__ */ createRESTModule(getCurrentMember2);
      getMember4 = /* @__PURE__ */ createRESTModule(getMember3);
      listMembers4 = /* @__PURE__ */ createRESTModule(listMembers3);
      muteMember4 = /* @__PURE__ */ createRESTModule(muteMember3);
      unmuteMember4 = /* @__PURE__ */ createRESTModule(unmuteMember3);
      approveMember4 = /* @__PURE__ */ createRESTModule(approveMember3);
      blockMember4 = /* @__PURE__ */ createRESTModule(blockMember3);
      disconnectMember4 = /* @__PURE__ */ createRESTModule(disconnectMember3);
      deleteMember4 = /* @__PURE__ */ createRESTModule(deleteMember3);
      deleteMyMember4 = /* @__PURE__ */ createRESTModule(deleteMyMember3);
      bulkDeleteMembers4 = /* @__PURE__ */ createRESTModule(bulkDeleteMembers3);
      bulkDeleteMembersByFilter4 = /* @__PURE__ */ createRESTModule(bulkDeleteMembersByFilter3);
      bulkApproveMembers4 = /* @__PURE__ */ createRESTModule(bulkApproveMembers3);
      bulkBlockMembers4 = /* @__PURE__ */ createRESTModule(bulkBlockMembers3);
      createMember4 = /* @__PURE__ */ createRESTModule(createMember3);
      updateMember4 = /* @__PURE__ */ createRESTModule(updateMember3);
      deleteMemberPhones4 = /* @__PURE__ */ createRESTModule(deleteMemberPhones3);
      deleteMemberEmails4 = /* @__PURE__ */ createRESTModule(deleteMemberEmails3);
      deleteMemberAddresses4 = /* @__PURE__ */ createRESTModule(deleteMemberAddresses3);
      queryMembers4 = /* @__PURE__ */ createRESTModule(customQueryMembers);
      onMemberCreated2 = createEventModule(onMemberCreated);
      onMemberDeleted2 = createEventModule(onMemberDeleted);
      onMemberUpdated2 = createEventModule(onMemberUpdated);
    }
  });

  // node_modules/@wix/auto_sdk_members_member-privacy-settings/build/es/index.mjs
  var init_es19 = __esm({
    "node_modules/@wix/auto_sdk_members_member-privacy-settings/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_members_member-report/build/es/index.mjs
  var utils7, onMemberReportCreated, onMemberReportDeleted, onMemberReportReportedMemberCreated, onMemberReportReportedMemberDeleted, onMemberReportCreated2, onMemberReportDeleted2, onMemberReportReportedMemberCreated2, onMemberReportReportedMemberDeleted2;
  var init_es20 = __esm({
    "node_modules/@wix/auto_sdk_members_member-report/build/es/index.mjs"() {
      init_rename_all_nested_keys();
      init_timestamp();
      init_transform_paths();
      init_browser2();
      init_query_builder_utils();
      init_event_definition_modules();
      utils7 = {
        query: {
          ...createQueryUtils()
        }
      };
      onMemberReportCreated = EventDefinition(
        "wix.members.v1.member_report_created",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "entity.createdDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onMemberReportDeleted = EventDefinition(
        "wix.members.v1.member_report_deleted",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "undefined.createdDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onMemberReportReportedMemberCreated = EventDefinition(
        "wix.members.v1.member_report_reported_member_created",
        true,
        (event) => renameKeysFromRESTResponseToSDKResponse(
          transformPaths(event, [
            {
              transformFn: transformRESTTimestampToSDKTimestamp,
              paths: [
                { path: "data.reportedMember.lastReportDate" },
                { path: "metadata.eventTime" }
              ]
            }
          ])
        )
      )();
      onMemberReportReportedMemberDeleted = EventDefinition(
        "wix.members.v1.member_report_reported_member_deleted",
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
      onMemberReportCreated2 = createEventModule(
        onMemberReportCreated
      );
      onMemberReportDeleted2 = createEventModule(
        onMemberReportDeleted
      );
      onMemberReportReportedMemberCreated2 = createEventModule(
        onMemberReportReportedMemberCreated
      );
      onMemberReportReportedMemberDeleted2 = createEventModule(
        onMemberReportReportedMemberDeleted
      );
    }
  });

  // node_modules/@wix/auto_sdk_members_member-role-definition/build/es/index.mjs
  var init_es21 = __esm({
    "node_modules/@wix/auto_sdk_members_member-role-definition/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_members_member-to-member-block/build/es/index.mjs
  var init_es22 = __esm({
    "node_modules/@wix/auto_sdk_members_member-to-member-block/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_members_authorization/build/es/index.mjs
  var init_es23 = __esm({
    "node_modules/@wix/auto_sdk_members_authorization/build/es/index.mjs"() {
    }
  });

  // node_modules/@wix/auto_sdk_members_member-followers/build/es/index.mjs
  var onFollowMemberFollowed, onFollowMemberUnfollowed, onFollowMemberFollowed2, onFollowMemberUnfollowed2;
  var init_es24 = __esm({
    "node_modules/@wix/auto_sdk_members_member-followers/build/es/index.mjs"() {
      init_rename_all_nested_keys();
      init_timestamp();
      init_transform_paths();
      init_browser2();
      init_event_definition_modules();
      onFollowMemberFollowed = EventDefinition(
        "wix.members.v3.follow_member_followed",
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
      onFollowMemberUnfollowed = EventDefinition(
        "wix.members.v3.follow_member_unfollowed",
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
      onFollowMemberFollowed2 = createEventModule(
        onFollowMemberFollowed
      );
      onFollowMemberUnfollowed2 = createEventModule(
        onFollowMemberUnfollowed
      );
    }
  });

  // node_modules/@wix/members/build/es/index.mjs
  var init_es25 = __esm({
    "node_modules/@wix/members/build/es/index.mjs"() {
      init_es8();
      init_es9();
      init_es10();
      init_es11();
      init_es12();
      init_es13();
      init_es14();
      init_es15();
      init_es16();
      init_es17();
      init_es18();
      init_es19();
      init_es20();
      init_es21();
      init_es22();
      init_es23();
      init_es24();
    }
  });

  // public/consultant-login.js
  var require_consultant_login = __commonJS({
    "public/consultant-login.js"() {
      init_build();
      init_esm();
      init_es25();
      var BACKEND = "https://test-consultation-app.zend-apps.com";
      var REACT = "https://viewy-hyperintelligently-toshiko.ngrok-free.dev";
      var wixClient = createClient({
        auth: site.auth(),
        host: site.host({
          applicationId: "e87fc4f0-d74b-463f-ad77-b813eec84846"
        }),
        modules: {
          members: es_exports6
        }
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
              if (!response.ok)
                throw new Error(`get-instance HTTP ${response.status}`);
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
          await this.fetchInstance();
          await this.waitForMember();
          if (!this.instance) {
            console.error("\u274C No Wix instance");
          }
          const token = localStorage.getItem("token");
          const isLoggedIn = localStorage.getItem("consultant_logged_in");
          this.createIframe(token && isLoggedIn === "true" ? "dashboard" : "login");
        }
        async waitForMember() {
          try {
            console.log("\u{1F504} Getting current member...");
            const response = await wixClient.members.getCurrentMember({
              fieldsets: ["FULL"]
            });
            if (!response?.member) {
              console.log("\u274C Guest user \u2014 not logged in");
              return;
            }
            const member = response.member;
            console.log("\u2705 Member found:", member.loginEmail);
            console.log("\u2705 Member found:", JSON.stringify(member, null, 2));
            await this._processMember(
              {
                type: "WIX_MEMBER",
                memberId: member._id,
                email: member.loginEmail,
                firstName: member.contact?.firstName || member.profile?.nickname || "",
                lastName: member.contact?.lastName || "",
                photo: member.profile?.photo?.url || ""
              },
              () => {
              }
            );
          } catch (err) {
            console.error("\u274C waitForMember error:", err.message);
          }
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
      if (!customElements.get("consultly-widget")) {
        customElements.define("consultly-widget", ConsultantLogin);
      }
      if (!customElements.get("our-consultant")) {
        customElements.define("our-consultant", class extends ConsultantLogin {
        });
      }
    }
  });
  return require_consultant_login();
})();
