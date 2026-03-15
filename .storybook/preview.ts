import type { Decorator, Preview } from "@storybook/react-vite";
import { createElement, type PropsWithChildren, useEffect } from "react";
import "../src/index.css";

// Componente wrapper para aplicar el tema
const ThemeWrapper = ({ theme, children }: PropsWithChildren<{ theme: string }>) => {
  useEffect(() => {
    const htmlElement = document.documentElement;

    // Remover ambas clases primero
    htmlElement.classList.remove("light", "dark");

    // Aplicar la clase del tema seleccionado
    htmlElement.classList.add(theme);

    // Actualizar color-scheme
    htmlElement.style.colorScheme = theme;
  }, [theme]);

  return children;
};

// Decorator para aplicar el tema a la raíz de Storybook
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme || "light";
  return createElement(ThemeWrapper, { theme }, createElement(Story));
};

const preview: Preview = {
  decorators: [withTheme],

  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme for components",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", icon: "sun", title: "Light" },
          { value: "dark", icon: "moon", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: "error",
    },

    backgrounds: {
      disable: true, // Desactivar backgrounds por defecto ya que usamos nuestro sistema de temas
    },
  },
};

export default preview;
