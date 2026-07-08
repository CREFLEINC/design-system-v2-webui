import type { Preview } from '@storybook/react-vite'
import '../styles/index.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: '라이트/다크 테마',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true }
    }
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.theme = context.globals.theme as string
      return Story()
    }
  ]
}
export default preview
