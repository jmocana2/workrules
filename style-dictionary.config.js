import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary from 'style-dictionary';

await register(StyleDictionary, {
  excludeParentKeys: true
});

const FONT_WEIGHT_MAP = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700
};

StyleDictionary.registerTransform({
  name: 'workrules/font-weight-text-to-number',
  type: 'value',
  matcher: token => {
    const sourceValue =
      typeof token.$value === 'string' ? token.$value : token.value;

    if (typeof sourceValue !== 'string') {
      return false;
    }

    const tokenPath = (token.path ?? []).join(' ').toLowerCase();
    const tokenName = (token.name ?? '').toLowerCase();

    return (
      tokenPath.includes('font weight') ||
      tokenPath.includes('fontweight') ||
      tokenName.includes('fontweight')
    );
  },
  transform: token => {
    const sourceValue =
      typeof token.$value === 'string' ? token.$value : token.value;
    const mappedValue =
      typeof sourceValue === 'string'
        ? FONT_WEIGHT_MAP[sourceValue.toLowerCase()]
        : undefined;

    return mappedValue ?? sourceValue;
  }
});

StyleDictionary.registerTransformGroup({
  name: 'tokens-studio-workrules',
  transforms: [
    ...StyleDictionary.hooks.transformGroups['tokens-studio'],
    'workrules/font-weight-text-to-number'
  ]
});

const isWorkrulesThemeToken = token => {
  const [section, subsection] = token.path ?? [];

  if (section === 'Colors') {
    return ['Accent', 'Neutral', 'Semantic', 'Default'].includes(subsection);
  }

  return ['Tokens', 'Panel', 'Typography', 'Radius', 'Spacing'].includes(
    section
  );
};

export default {
  source: ['design-system/tokens/tokens.json'],
  preprocessors: ['tokens-studio'],
  platforms: {
    css: {
      transformGroup: 'tokens-studio-workrules',
      buildPath: 'src/styles/tokens/',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables',
          filter: isWorkrulesThemeToken
        }
      ]
    }
  }
};
