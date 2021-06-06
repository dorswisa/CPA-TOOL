
var CF = require('./modules/class-list');
var DBM = require('./modules/manager');
var EM = require('./modules/email-dispatcher');


module.exports = function(app) {
	const multer = require('multer');
	const upload = multer();
	const fs = require('fs');

	/*
		Home page
	*/

	app.get('/home', function(req, res) {
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			res.render('home', {
				udata: req.session.user
			});
		}
	});

	/*
        login page
    */
	app.get('/', function(req, res){
		if(req.query['key'] !== undefined) {
			DBM.validatePasswordKey(req.query['key'], req.ip, function (e, o) {
				if (o != null) {
					req.session.passKey = req.query['key'];
					res.render('login', {
						popUpPass: true
					});
				} else res.redirect('/');
			});
		}
		else {
			// check if the user has an auto login key saved in a cookie //
			if (req.cookies.login == undefined) {
				res.render('login', {title: 'Hello - Please Login To Your Account'});
			} else {
				// attempt automatic login //
				DBM.validateLoginKey(req.cookies.login, req.ip, function (e, o) {
					if (o) {
						DBM.autoLogin(o.email, o.pass, function (o) {
							req.session.user = o;
							res.redirect('/home');
						});
					} else {
						console.log("BBB");
						res.render('login', {title: 'Hello - Please Login To Your Account'});
					}
				});
			}
		}
	});

	app.get('/signup', function(req, res){
		if (req.session.user == null){
			res.render('signup');
		}
		else
		{
			res.redirect('/');
		}
	});

	app.post('/signup', function(req, res){
		DBM.addNewUser({
			name 		: req.body['signup-name'],
			email 		: req.body['signup-email'],
			pass		: req.body['signup-password']
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				res.status(200).send('ok');
			}
		});
	});

	app.post('/login', function(req, res){
		DBM.manualLogin(req.body['login-email'], req.body['login-password'], function(e, o){
			if (!o){
				res.status(400).send(e);
			}	else{
				req.session.user = o;
				if (req.body['remember-me'] != 'on'){
					res.status(200).send(o);
				}	else{
					DBM.generateLoginKey(o.email, req.ip, function(key){
						res.cookie('login', key, { maxAge: 900000 });
						res.status(200).send(o);
					});
				}
			}
		});
	});

	app.post('/forget', function(req, res){
		DBM.generatePasswordKey(req.body['reset-password'], req.ip, function(e, account){
			if (e){
				res.status(400).send(e);
			}	else{
				EM.dispatchResetPasswordLink(account, function(e, m){
					if (!e){
						res.status(200).send('ok');
					}	else{
						for (k in e) console.log('ERROR : ', k, e[k]);
						res.status(400).send('unable to dispatch password reset');
					}
				});
			}
		});
	});

	app.post('/editpassword', function(req, res){
		let passKey = req.session.passKey;
		// destory the session after retrieving the stored passkey //
		req.session.destroy();
		DBM.updatePassword(passKey, req.body['edit-password'], function(e, o){
			if (o){
				res.status(200).send('ok');
			}	else{
				res.status(400).send('unable to update password');
			}
		})
	});

	/*
		Edit user and logout page
	*/

	app.get('/my-user', function(req, res) {
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			res.render('my-user', {
				udata : req.session.user
			});
		}
	});

	app.post('/my-user', function(req, res){
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			DBM.updateAccount( req.session.user._id,{
				name	: req.body['edit-username'],
				email	: req.body['edit-email'],
				pass	: req.body['edit-password']
			}, function(e, o){
				if (e){
					res.status(400).send(e);
				}	else{
					req.session.user = o;
					res.status(200).send('ok');
				}
			});
		}
	});

	app.post('/upload-file', upload.any(), function(req, res){
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			var flag=true;
			for(var i=0;i<req.files.length; i++)
			{
				if(req.files[i].mimetype != 'application/pdf')
				{
					res.status(200).send('file-not-supported');
					flag = false;
				}
			}
			if(flag)
			{
				DBM.AddFiles( req.session.user._id,{
					commit	: req.body['addcommit'],
					month	: req.body['changemonth'] == 'true' ? req.body['month'] : undefined
				}, req.files, function(e, o){
					if (e){
						res.status(200).send(e);
					}	else{
						req.session.user = o;
						res.status(200).send('ok');
					}
				});
			}
		}
	});

	app.post('/delete-file', function(req, res){
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			DBM.deleteFile( req.session.user._id, req.body['file'], function(e, o){
				if (e){
					res.status(200).send(e);
				}	else{
					req.session.user = o;
					res.status(200).send('ok');
				}
			});
		}
	});

	app.post('/delete', function(req, res){
		DBM.deleteAccount(req.session.user._id, function(e, obj){
			if (!e){
				res.clearCookie('login');
				req.session.destroy(function(e){ res.status(200).send('ok'); });
			}	else{
				res.status(400).send('record not found');
			}
		});
	});

	app.post('/settings', function(req, res){
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			DBM.EditSettings( req.session.user._id, {
				accmail 		: req.body['accmail'],
				signature 		: req.body['signature']}
				, function(e, o){
				if (e){
					res.status(200).send(e);
				}	else{
					req.session.user = o;
					res.status(200).send('ok');
				}
			});
		}
	});

	app.post('/send-file', function(req, res){
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			EM.SendFile(req.session.user, req.body['file'], function(e, m){
				if (!e){
					res.status(200).send('ok');
				}	else{
					for (k in e) console.log('ERROR : ', k, e[k]);
					res.status(400).send('unable to dispatch password reset');
				}
			});
		}
	});

	app.post('/sendall', function(req, res){
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			EM.SendFiles(req.session.user, req.body['files'], undefined, function(e, m){
				if (!e){
					res.status(200).send('ok');
				}	else{
					for (k in e) console.log('ERROR : ', k, e[k]);
					res.status(400).send('unable to dispatch password reset');
				}
			});
		}
	});

	app.post('/logout', function(req, res)
	{
		res.clearCookie('login');
		req.session.destroy(function(e){ res.status(200).send('ok'); });
	});

	/*
		rest of pages
	*/

	app.get('*', function(req, res) { res.render('404', { title: 'Page Not Found'}); });
};
