var CACHE_NAME = 'my-site-cache-v1';
var urlsToCache = [
	'index.html',
	'images/background.jpg',
	'css/bootstrap.min.css',
	'css/sweetalert.css',
	'dist/summernote-bs4.css',
	'js/jquery.js',
	'js/popper.min.js',
	'js/bootstrap.min.js',
	'js/sweetalert.min.js',
	'dist/summernote-bs4.js',
	'dist/font/summernote.woff'
];

self.addEventListener('install', function(event) {
	console.log('[ServiceWorker] Install');
	//perform install steps
	event.waitUntil(
		caches.open(CACHE_NAME).then(function(cache) {
			console.log('[ServiceWorker] Caching app shell');
			return cache.addAll(urlsToCache)
			.then(() => self.skipWaiting());
		})
	);
});

self.addEventListener('activate', function(event) {
	//event.waitUntil(self.clients.claim());

	/*event.waitUntil(
		somethingThatReturnsAPromise().then(function() {
			console.log('Activated!');
		})
	);*/
  	console.log('[ServiceWorker] Activate');
	event.waitUntil(
		caches.keys().then(function(keyList) {
			return Promise.all(keyList.map(function(key) {
				if (key !== CACHE_NAME) {
				  console.log('[ServiceWorker] Removing old cache', key);
				  return caches.delete(key);
				}
			}));
		})
	);
	return self.clients.claim();
});

self.addEventListener('fetch', function(event) {
	console.log('[ServiceWorker] Fetch', event.request.url);
	event.respondWith(
		caches.match(event.request)
			.then(function(response) {
				//Cache hit -return response
				if (response) {
					return response;
				}

				//importante: clone the request. A request is a stream and
				//can only be consumed once. Since we are consuming this
				//once by cache and once by the browser for fetch, we need 
				//to clone the response.
				
				
				var fetchRequest = event.request.clone();

				return fetch(fetchRequest).then(function(response) {
					//check if we received a valid response
					if(!response || response.status !== 200 || response.type !== 'basic') {
						return response;
					}

					//Important: Clone the response. A response is a stream 
					//and because we want the browser to consume the response 
					//as well as the cache consuming the response, we need 
					//to clone it so we have two streams.
					
					var responseToCache = response.clone();

					caches.open(CACHE_NAME).then(function(cache) {
						cache.put(event.request, responseToCache);
					});

					return response;
				});
			})
	);
});
