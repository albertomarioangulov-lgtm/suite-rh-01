export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (loggedIn.value && to.path.startsWith('/auth')) {
    return navigateTo('/home')
  }
})
