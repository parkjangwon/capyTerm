// Vuetify plugin factory
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#121212',
          surface: '#1E1E1E',
          primary: '#7E57C2',
          secondary: '#26A69A',
          success: '#4CAF50',
          info: '#29B6F6',
          warning: '#FFB300',
          error: '#E53935',
        },
      },
    },
  },
})

export default vuetify


