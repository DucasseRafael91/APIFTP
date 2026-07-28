const FtpSrv = require('ftp-srv');
const ftpServer = new FtpSrv({
  url: 'ftp://127.0.0.1:2121',
  pasv_range: '2122-2130',
  pasv_url: '127.0.0.1'
});

ftpServer.on('login', (data, resolve) => resolve({ root: __dirname + '/test-ftp-storage' }));
ftpServer.listen().then(() => console.log('Faux serveur FTP de test sur le port 2121'));