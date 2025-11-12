/**
 * Default email theme configuration
 * Used when no city is selected or city theme is not configured
 */
export interface CityEmailTheme {
  appName: string;
  appNameDisplay: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  greetingTemplate?: string;
  emailTheme?: {
    headerBackgroundColor?: string;
    footerBackgroundColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
  };
}

export const DEFAULT_EMAIL_THEME: CityEmailTheme = {
  appName: 'Heidi',
  appNameDisplay: 'Heidi App',
  primaryColor: '#009EE0',
  secondaryColor: '#1a1a2e',
  accentColor: '#009EE0',
  greetingTemplate: 'Welcome to {appName}{firstNamePart}!',
  emailTheme: {
    headerBackgroundColor: '#1a1a2e',
    footerBackgroundColor: '#009EE0',
    buttonColor: '#ffffff',
    buttonTextColor: '#009EE0',
  },
};
