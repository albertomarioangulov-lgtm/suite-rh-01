/**
 * useBackground — fondo profesional para páginas de autenticación.
 *
 * Mejoras frente al enfoque original de casaroca-01:
 * - Imágenes locales en public/images/login/ (sin dependencia de red ni Pexels).
 * - Selección SSR-safe con useState: la imagen elegida en el servidor se
 *   sincroniza al cliente vía payload, evitando mismatch de hidratación.
 * - Degradado oscuro semitransparente sobre la imagen para garantizar
 *   contraste y legibilidad de la tarjeta de login.
 */

const LOGIN_BACKGROUNDS = [
  '/images/login/login-calculadora-dinero.jpg',
  '/images/login/login-calculadora-papel.jpg',
  '/images/login/login-finanzas-graficas.jpg',
  '/images/login/login-impuestos-laptop.jpg',
] as const

export const useBackground = () => {
  const currentIndex = useState<number>('login-background-index', () =>
    Math.floor(Math.random() * LOGIN_BACKGROUNDS.length),
  )

  const currentImage = computed(() => LOGIN_BACKGROUNDS[currentIndex.value])

  const backgroundStyle = computed(() => ({
    backgroundImage: `linear-gradient(rgba(10, 22, 44, 0.62), rgba(10, 22, 44, 0.8)), url('${currentImage.value}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    minHeight: '100vh',
  }))

  return {
    backgroundImages: LOGIN_BACKGROUNDS,
    currentImage,
    backgroundStyle,
  }
}

export default useBackground
