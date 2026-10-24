import React from 'react';
import { Alert, View, Text, ScrollView } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocaleProvider } from './src/i18n/LocaleProvider';
import { AppAlertHost } from './src/ui/AppAlert';
import "./global.css"

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
  },
};

// ---------- Error Boundary ----------
type EBState = { error: Error | null };
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(e: Error): EBState { return { error: e }; }
  componentDidCatch(e: Error, info: React.ErrorInfo) {
    console.error('🔴 RENDER CRASH:', e.message);
    console.error('🔴 STACK:', e.stack?.slice(0, 1200));
    console.error('🔴 COMPONENT:', info.componentStack?.slice(0, 600));
    Alert.alert('Render crash', `${e.message}\n\n${info.componentStack?.slice(0, 600)}`);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, padding: 20, paddingTop: 60 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
            Error: {this.state.error.message}
          </Text>
          <ScrollView>
            <Text style={{ fontSize: 12, color: '#666' }}>{this.state.error.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

// ---------- App ----------
const App: React.FC = () => {
  React.useEffect(() => {
    try {
      const EU = (globalThis as any).__errorUtils ?? (globalThis as any).ErrorUtils;
      if (EU?.setGlobalHandler) {
        const prev = EU.getGlobalHandler?.();
        EU.setGlobalHandler((error: any, isFatal: boolean) => {
          Alert.alert(
            isFatal ? 'Fatal JS error' : 'JS error',
            `${error?.message ?? String(error)}\n\n${error?.stack?.slice(0, 600) ?? ''}`,
          );
          prev?.(error, isFatal);
        });
        return () => { EU.setGlobalHandler(prev); };
      }
    } catch {}
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <LocaleProvider>
          <NavigationContainer theme={MyTheme}>
            <AppNavigator />
          </NavigationContainer>
          <AppAlertHost />
        </LocaleProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;
