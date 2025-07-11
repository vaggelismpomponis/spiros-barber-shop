self.addEventListener('push', function(event) {
  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    data = { title: 'Notification', body: event.data.text() }
  }
  self.registration.showNotification(data.title || 'Notification', {
    body: data.body || '',
    icon: '/favicon.svg',
    data: data.url || null
  })
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  if (event.notification.data) {
    event.waitUntil(clients.openWindow(event.notification.data))
  }
}) 