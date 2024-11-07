chrome.runtime.sendMessage({method: 'shouldTeXify', host: location.host},
  function(response) {
    console.log('Received response from background script:', response);
    if (response && JSON.parse(response.answer)) {
      // MathJax Script
      var mathjax = document.createElement('script');
      mathjax.type = 'text/javascript';
      mathjax.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js?config=TeX-AMS-MML_HTMLorMML&delayStartupUntil=configured';

      mathjax.onload = function() {
        console.log('MathJax script loaded successfully');
        try {
          if (typeof MathJax !== 'undefined' && MathJax.Hub) {
            console.log('Configuring MathJax now');
            MathJax.Hub.Config({
              tex2jax: {
                inlineMath: [['$', '$'], ['\(', '\)']],
                displayMath: [['$$', '$$'], ['\[', '\]']],
                skipTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
              }
            });
            MathJax.Hub.Queue(function() {
              console.log('MathJax is ready for processing content on the page.');
              // Test renderWithCache function
              console.log('Calling renderWithCache for test texCode: E = mc^2');
              renderWithCache('E = mc^2', function(imageData) {
                console.log('Callback from renderWithCache with imageData:', imageData);
                if (imageData) {
                  // Adding the generated image to the page for visibility
                  let img = document.createElement('img');
                  img.src = imageData;
                  document.body.appendChild(img);
                } else {
                  console.error('No imageData returned from renderWithCache');
                }
              });
            });
          } else {
            console.error('MathJax is still not defined after script load');
          }
        } catch (error) {
          console.error('Error during MathJax configuration:', error);
        }
      };

      mathjax.onerror = function() {
        console.error('Failed to load MathJax script');
      };

      // Append MathJax script to the document
      console.log('Appending MathJax script to document body');
      document.body.appendChild(mathjax);

      // Directly call renderWithCache to test caching functionality, independent of MathJax
      console.log('Testing renderWithCache directly before MathJax to verify caching functionality');
      renderWithCache('E = mc^2', function(imageData) {
        console.log('Direct call to renderWithCache returned imageData:', imageData);
        if (imageData) {
          // Adding the generated image to the page for visibility
          let img = document.createElement('img');
          img.src = imageData;
          document.body.appendChild(img);
        } else {
          console.error('No imageData returned from direct call to renderWithCache');
        }
      });

      // Cache handling function
      function renderWithCache(texCode, callback) {
        console.log('renderWithCache function called for texCode:', texCode);
        let hash = generateHash(texCode);
        hash.then(function(hashValue) {
          console.log('Generated hash for texCode:', hashValue);
          getFromIndexedDB(hashValue, function(cachedImage) {
            if (cachedImage) {
              console.log('Cache hit for hash:', hashValue);
              // If cached, return cached image
              callback(cachedImage);
            } else {
              console.log('Cache miss for hash:', hashValue);
              // If not cached, simulate rendering and save to IndexedDB
              console.log('Simulating rendering for texCode:', texCode);
              // Simulate rendering output (replace with real rendering when available)
              let renderedImage = new Image();
              renderedImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...'; // Simulated base64 data
              console.log('Converting simulated output to Base64 image');
              let canvas = document.createElement('canvas');
              let context = canvas.getContext('2d');
              canvas.width = 100; // Example width
              canvas.height = 50; // Example height
              context.fillStyle = "#FFFFFF";
              context.fillRect(0, 0, canvas.width, canvas.height);
              let base64Image = canvas.toDataURL('image/png');

              console.log('Saving rendered image to IndexedDB for hash:', hashValue);
              saveToIndexedDB(hashValue, base64Image);
              callback(base64Image);
            }
          });
        }).catch(function(error) {
          console.error('Error generating hash:', error);
        });
      }

      // Original Page Script Handling
      var delimiters = response.delimiters;
      var inline_delimiters = [];
      if (delimiters.inline_dollar) {
        inline_delimiters.push(['$', '$']);
      }
      if (delimiters.inline_bracket) {
        inline_delimiters.push(['[;', ';]']);
      }
      if (delimiters.inline_custom) {
        inline_delimiters.push(delimiters.inline_custom);
      }
      var display_delimiters = [];
      if (delimiters.display_dollar) {
        display_delimiters.push(['$$', '$$']);
      }
      if (delimiters.display_bracket) {
        display_delimiters.push(['\[', '\]']);
      }
      if (delimiters.display_custom) {
        display_delimiters.push(delimiters.display_custom);
      }

      var pageScript = document.createElement('script');
      pageScript.id = 'texAllTheThingsPageScript';
      pageScript.type = 'text/javascript';
      pageScript.src = chrome.extension.getURL('js/pageScript.js');
      pageScript.setAttribute('inlineMath', JSON.stringify(inline_delimiters));
      pageScript.setAttribute('displayMath', JSON.stringify(display_delimiters));
      pageScript.setAttribute('skipTags', JSON.stringify(response.skip_tags));
      pageScript.setAttribute('ignoreClass', JSON.stringify(response.ignore_class));
      pageScript.setAttribute('processClass', JSON.stringify(response.process_class));

      document.body.appendChild(pageScript);
    } else {
      console.error('Response answer is invalid or undefined');
    }
  });

// Functions to handle IndexedDB (you'll need to implement these)

function generateHash(input) {
  // Using SubtleCrypto API to generate SHA-1 hash
  console.log('Generating hash for input:', input);
  return crypto.subtle.digest('SHA-1', new TextEncoder().encode(input)).then(buffer => {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

function getFromIndexedDB(key, callback) {
  console.log('Opening IndexedDB to get key:', key);
  let request = indexedDB.open('MathJaxCache', 1);

  request.onupgradeneeded = function(event) {
    let db = event.target.result;
    if (!db.objectStoreNames.contains('images')) {
      console.log('Creating object store for images');
      db.createObjectStore('images');
    }
  };

  request.onsuccess = function(event) {
    console.log('IndexedDB opened successfully for retrieval');
    let db = event.target.result;
    let transaction = db.transaction(['images'], 'readonly');
    let store = transaction.objectStore('images');
    let getRequest = store.get(key);

    getRequest.onsuccess = function() {
      if (getRequest.result) {
        console.log('Retrieved value from IndexedDB for key:', key);
      } else {
        console.log('No value found in IndexedDB for key:', key);
      }
      callback(getRequest.result);
    };

    getRequest.onerror = function() {
      console.error('Failed to get value from IndexedDB for key:', key);
      callback(null);
    };
  };

  request.onerror = function() {
    console.error('Failed to open IndexedDB for retrieval');
    callback(null);
  };
}

function saveToIndexedDB(key, value) {
  console.log('Opening IndexedDB to save key:', key);
  let request = indexedDB.open('MathJaxCache', 1);

  request.onupgradeneeded = function(event) {
    let db = event.target.result;
    if (!db.objectStoreNames.contains('images')) {
      console.log('Creating object store for images');
      db.createObjectStore('images');
    }
  };

  request.onsuccess = function(event) {
    console.log('IndexedDB opened successfully for saving');
    let db = event.target.result;
    let transaction = db.transaction(['images'], 'readwrite');
    let store = transaction.objectStore('images');
    let putRequest = store.put(value, key);

    putRequest.onsuccess = function() {
      console.log('Image saved to cache successfully for key:', key);
      console.log('Save to IndexedDB complete for key:', key);
    };

    putRequest.onerror = function() {
      console.error('Failed to save image to cache for key:', key);
    };
  };

  request.onerror = function() {
    console.error('Failed to open IndexedDB for saving');
  };
}
