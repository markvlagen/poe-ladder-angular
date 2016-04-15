# POE Ladder Angular

Run `npm install`to install dependencies.  
Run `gulp` or `gulp watch` to run all tasks.

Source is found in ./src.  
Gulp will build to ./dist, minified if the NODE_ENV environment variable is PROD.

Data is scraped from http://ssf.poeladder.com.  
Calls from the Angular app are made to relative paths. If the app is hosted at http://www.example.com/test/, calls will be made to http://www.example.com/test/accounts.php, etc. I use .htaccess locally to fake having the dist directory at the same level, feel free to change this however.
