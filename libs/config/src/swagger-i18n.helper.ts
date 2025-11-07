import { ConfigService } from './config.service';

/**
 * Language configuration for Swagger UI
 */
interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

/**
 * Default language options with native names
 */
const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'dk', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'se', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
];

/**
 * Get Swagger UI options with i18n language selector
 * @param configService ConfigService instance
 * @returns Swagger UI setup options
 */
export function getSwaggerI18nOptions(configService: ConfigService) {
  const defaultLanguage = configService.get<string>('i18n.defaultLanguage', 'en');
  const supportedLanguages = configService.get<string[]>('i18n.supportedLanguages') || [
    'de',
    'en',
    'dk',
    'no',
    'se',
    'ar',
    'fa',
    'tr',
    'ru',
    'uk',
  ];

  // Filter language options to only include supported languages
  const languageOptions = DEFAULT_LANGUAGES.filter((lang) =>
    supportedLanguages.includes(lang.code),
  );

  // Generate language selector HTML
  const languageOptionsHtml = languageOptions
    .map((lang) => `<option value="${lang.code}">${lang.nativeName} (${lang.name})</option>`)
    .join('');

  // Build the JavaScript code string at TypeScript level with interpolated values
  const languageSelectorJs = `
    (function() {
      'use strict';

      // Language storage key - shared across all services
      const LANGUAGE_STORAGE_KEY = 'heidi-swagger-language';
      const LANGUAGE_QUERY_PARAM = 'lang';
      const DEFAULT_LANGUAGE = ${JSON.stringify(defaultLanguage)};
      const LANGUAGE_OPTIONS_HTML = ${JSON.stringify(languageOptionsHtml)};

      // Helper function to get language from URL or storage
      function getLanguage() {
        // First, check URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get(LANGUAGE_QUERY_PARAM);

        if (urlLang) {
          // Save to localStorage for persistence
          localStorage.setItem(LANGUAGE_STORAGE_KEY, urlLang);
          return urlLang;
        }

        // Fall back to localStorage
        return localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;
      }

      // Helper function to update URL with language parameter
      function updateUrlWithLanguage(lang) {
        const url = new URL(window.location.href);
        url.searchParams.set(LANGUAGE_QUERY_PARAM, lang);
        // Update URL without reload (using history API)
        window.history.replaceState({}, '', url.toString());
      }

      // Wait for DOM to be ready
      function initLanguageSelector() {
        // Check if selector already exists
        if (document.getElementById('swagger-i18n-selector')) {
          return;
        }

        // Create language selector container
        const selector = document.createElement('div');
        selector.id = 'swagger-i18n-selector';
        selector.className = 'swagger-i18n-selector';

        // Get current language (from URL or storage)
        const savedLang = getLanguage();

        // Create label
        const label = document.createElement('label');
        label.setAttribute('for', 'swagger-lang-select');
        label.textContent = '🌐 Language:';

        // Create indicator
        const indicator = document.createElement('div');
        indicator.className = 'language-indicator';
        indicator.textContent = savedLang.toUpperCase();

        // Create select element
        const select = document.createElement('select');
        select.id = 'swagger-lang-select';
        select.innerHTML = LANGUAGE_OPTIONS_HTML;
        select.value = savedLang;

        // Update indicator, localStorage, and URL when language changes
        select.addEventListener('change', function() {
          const selectedLang = this.value;

          // Save to localStorage
          localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLang);

          // Update URL
          updateUrlWithLanguage(selectedLang);

          // Update indicator
          indicator.textContent = selectedLang.toUpperCase();

          // Show notification
          showLanguageChangeNotification(selectedLang);
        });

        // Assemble the selector
        selector.appendChild(label);
        selector.appendChild(indicator);
        selector.appendChild(select);

        // Insert into body
        document.body.appendChild(selector);

        // Add notification function
        function showLanguageChangeNotification(lang) {
          // Remove existing notification if any
          const existing = document.getElementById('swagger-i18n-notification');
          if (existing) {
            existing.remove();
          }

          const notification = document.createElement('div');
          notification.id = 'swagger-i18n-notification';
          notification.style.cssText = 'position: fixed; top: 70px; right: 10px; z-index: 101; padding: 12px 20px; background: #4caf50; color: white; border-radius: 6px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; font-weight: 500; animation: slideIn 0.3s ease;';
          notification.textContent = 'Language changed to: ' + lang.toUpperCase() + '. Accept-Language header will be set to ' + lang.toUpperCase() + ' for all API requests.';

          // Add animation
          const style = document.createElement('style');
          style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
          document.head.appendChild(style);

          document.body.appendChild(notification);

          // Remove after 3 seconds
          setTimeout(() => {
            if (notification.parentNode) {
              notification.style.animation = 'slideIn 0.3s ease reverse';
              setTimeout(() => notification.remove(), 300);
            }
          }, 3000);
        }
      }

      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanguageSelector);
      } else {
        initLanguageSelector();
      }

      // Also initialize after Swagger UI loads (in case of async loading)
      const observer = new MutationObserver(function(mutations) {
        if (document.querySelector('.swagger-ui')) {
          initLanguageSelector();
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    })();
  `;

  // Build the onComplete function body as a string with the code embedded
  const onCompleteBody = `function () {
    try {
      const code = ${JSON.stringify(languageSelectorJs.trim())};
      eval(code);

      // Patch LiveResponse component to handle null responses
      // This prevents "Cannot read properties of null (reading 'get')" errors
      try {
        // Wait a bit for Swagger UI to fully initialize
        setTimeout(function() {
          try {
            const swaggerUI = window.ui || window.swaggerUi;
            if (swaggerUI && swaggerUI.getSystem) {
              const system = swaggerUI.getSystem();
              const components = system.getComponents();

              // Find LiveResponse component and patch its render method
              if (components && components.LiveResponse) {
                const OriginalLiveResponse = components.LiveResponse;
                if (OriginalLiveResponse && OriginalLiveResponse.prototype) {
                  const originalRender = OriginalLiveResponse.prototype.render;
                  if (originalRender && typeof originalRender === 'function') {
                    OriginalLiveResponse.prototype.render = function() {
                      try {
                        // Guard against null/undefined response prop
                        if (!this.props || !this.props.response) {
                          // Return null or empty element to prevent rendering
                          const React = window.React || (window.Re && window.Re.createElement ? { createElement: window.Re.createElement } : null);
                          if (React) {
                            return React.createElement('div', { className: 'live-response-empty', style: { display: 'none' } });
                          }
                          return null;
                        }
                        // Call original render if response exists
                        return originalRender.call(this);
                      } catch (renderError) {
                        // If render fails, return empty element
                        console.debug('LiveResponse render error:', renderError);
                        const React = window.React || (window.Re && window.Re.createElement ? { createElement: window.Re.createElement } : null);
                        if (React) {
                          return React.createElement('div', { className: 'live-response-error', style: { display: 'none' } });
                        }
                        return null;
                      }
                    };
                  }
                }
              }
            }
          } catch (patchError) {
            // Silently fail if patching doesn't work (Swagger UI version differences)
            console.debug('Could not patch LiveResponse component:', patchError);
          }
        }, 100);
      } catch (patchInitError) {
        console.debug('Could not initialize LiveResponse patch:', patchInitError);
      }
    } catch (error) {
      console.error('Failed to initialize language selector:', error);
    }
  }`;

  return {
    swaggerOptions: {
      persistAuthorization: true,
      // Request interceptor to add Accept-Language header
      // Priority: URL query parameter (?lang=de) > localStorage > default
      requestInterceptor: (request: any) => {
        // Guard against null/undefined request object
        if (!request) {
          return request;
        }

        // Ensure headers object exists
        if (!request.headers) {
          request.headers = {};
        }

        // Check URL query parameter first
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const urlLang = urlParams.get('lang');
          const language =
            urlLang || localStorage.getItem('heidi-swagger-language') || defaultLanguage;
          request.headers['Accept-Language'] = language;
        } catch (error) {
          // Fallback to default language if any error occurs
          request.headers['Accept-Language'] = defaultLanguage;
        }

        return request;
      },
      // Response interceptor to handle null/undefined responses
      // This prevents LiveResponse.render from crashing when response is null
      responseInterceptor: (response: any) => {
        // Guard against null/undefined response
        // Return a valid response structure if response is null
        if (!response) {
          return {
            ok: false,
            status: 0,
            statusText: 'No Response',
            headers: {},
            text: '',
            data: null,
          };
        }

        // Ensure response has required properties
        if (typeof response.get !== 'function') {
          // If response is not an Immutable object, wrap it
          const ok =
            response.ok !== undefined
              ? response.ok
              : response.status >= 200 && response.status < 300;
          return {
            ok,
            status: response.status || 0,
            statusText: response.statusText || '',
            headers: response.headers || {},
            text: response.text || '',
            data: response.data || response.body || null,
            get: function (key: string) {
              const map: Record<string, any> = {
                status: this.status,
                headers: this.headers,
                text: this.text,
                error: !this.ok,
                notDocumented: false,
                duration: 0,
              };
              return map[key] !== undefined ? map[key] : null;
            },
          };
        }

        return response;
      },
      // Inject JavaScript after Swagger UI loads
      onComplete: eval('(' + onCompleteBody + ')') as () => void,
    },
    customCss: `
      /* Language Selector Styles */
      .swagger-i18n-selector {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 100;
        padding: 12px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      .swagger-i18n-selector label {
        color: white;
        font-weight: 600;
        font-size: 14px;
        margin: 0;
        white-space: nowrap;
      }

      .swagger-i18n-selector select {
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.95);
        color: #333;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        min-width: 180px;
        transition: all 0.2s ease;
      }

      .swagger-i18n-selector select:hover {
        background: white;
        border-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .swagger-i18n-selector select:focus {
        outline: none;
        border-color: white;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
      }

      .swagger-i18n-selector .language-indicator {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
        text-transform: uppercase;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .swagger-i18n-selector {
          top: 5px;
          right: 5px;
          padding: 8px 12px;
        }

        .swagger-i18n-selector label {
          font-size: 12px;
        }

        .swagger-i18n-selector select {
          min-width: 140px;
          font-size: 12px;
          padding: 6px 10px;
        }
      }

      /* Hide default Swagger topbar if needed */
      .swagger-ui .topbar {
        display: none;
      }
    `,
  };
}
