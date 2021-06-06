
const crypto 		= require('crypto');
const moment 		= require('moment');
const fs 			= require('fs');
const MongoClient 	= require('mongodb').MongoClient;
var cron = require('node-cron');
var EM = require('./email-dispatcher');

var db, users;
MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true, useNewUrlParser: true }, function(e, client) {
	if (e){
		console.log(e);
	}	else{
		db = client.db(process.env.DB_NAME);
		users = db.collection('Users');
		// index fields 'user' & 'email' for faster new account validation //
		users.createIndex({user: 1, email: 1});
		console.log('mongo :: connected to database :: "'+process.env.DB_NAME+'"');
		users.findOne({email:"service.dnamovies@gmail.com"}, function(e, o) {					// insert admin user
			if (o == null) {
				var usr = users.insertOne({
					name: "Admin",
					email: "service.dnamovies@gmail.com",
					accmail: "service.dnamovies@gmail.com",
					pass: "JxusNiWHMl9bd97a99ff96c24797345e37480dfa58",
					signature: "Hi \<CPA-Name\>,\nRelevant documents from \<Company-Name\> are attached to this message.\nThis is an automatic message from the \"CPA TOOL\" system, do not reply to this message!",
					files: []
				},function(err,docsInserted){
					fs.mkdir("./app/public/users/"+docsInserted.ops[0]._id,{recursive: true},  function (err){if(err) console.log('error', err);});
				});
			}
		});
	}
});

cron.schedule('* * * * *', () => {
	var now = new Date();
	now.setDate( 0 );
	var dir = now.toLocaleString('en-US', {month: 'long'}) + " - " + now.getFullYear();
	users.find().toArray(
		function(e, res) {
			if (e) console.log(e);
			else {

				for(var i = 0; i<res.length; i++)
				{
					var currentfiles = [];
					for(var j=0;j<res[i].files.length; j++)
					{
						if(res[i].files[j].dir == dir)
						{
							currentfiles.push(res[i].files[j])
						}
					}
					if(currentfiles.length != 0)
					{
						EM.SendFiles(res[i], currentfiles, dir, function(e){
							if(e)
							{
								console.log(e);
							}
						});
					}
				}
			};
		});

},{
		scheduled: true,
		timezone:"Asia/Jerusalem"
});

const guid = function(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});}

/*
	login validation methods
*/

exports.autoLogin = function(email, pass, callback)
{
	users.findOne({email:email}, function(e, o) {
		if (o){
			o.pass == pass ? callback(o) : callback(null);
		}	else{
			callback(null);
		}
	});
}

exports.manualLogin = function(email, pass, callback)
{
	users.findOne({email:email}, function(e, o) {
		if (o == null){
			console.log(email + " Not found in the data base!");
			callback('user-not-found');
		}	else{
			validatePassword(pass, o.pass, function(err, res) {
				if (res){
					console.log("Connecting to: "+ email);
					callback(null, o);
				}	else{
					console.log(email + " found but the password does not match!");
					callback('invalid-password');
				}
			});
		}
	});
}

exports.addNewUser = function(newData, callback)
{
	users.findOne({email:newData.email}, function(e, o) {
		if (o){
			console.log(newData.email + " is taken!");
			callback('email-taken');
		}	else{
			saltAndHash(newData.pass, function(hash){
				newData.pass = hash;
				// append date stamp when record was created //
				newData.date = moment().format('DD/MM/YY, HH:mm:ss');
				newData.files = [];
				newData.accmail = newData.email;
				newData.signature = "Hi \<CPA-Name\>,\nRelevant documents from \<Company-Name\> are attached to this message.\nThis is an automatic message from the \"CPA TOOL\" system, do not reply to this message!";
				console.log(newData.name + " has been created in database!");
				users.insertOne(newData,function(err,docsInserted){
					fs.mkdir("./app/public/users/"+docsInserted.ops[0]._id,{recursive: true},  function (err){if(err) console.log('error', err);});
				});
				callback(null);
			});
		}
	});
}

exports.generateLoginKey = function(email, ipAddress, callback)
{
	let cookie = guid();
	users.findOneAndUpdate({email:email}, {$set:{
		ip : ipAddress,
		cookie : cookie
	}}, {returnOriginal : false}, function(e, o){ 
		callback(cookie);
	});
}

exports.validateLoginKey = function(cookie, ipAddress, callback)
{
// ensure the cookie maps to the user's last recorded ip address //
	users.findOne({cookie:cookie, ip:ipAddress}, callback);
}

exports.generatePasswordKey = function(email, ipAddress, callback)
{
	let passKey = guid();
	users.findOneAndUpdate({email:email}, {$set:{
		ip : ipAddress,
		passKey : passKey
	}, $unset:{cookie:''}}, {returnOriginal : false}, function(e, o){
		if (o.value != null){
			callback(null, o.value);
		}	else{
			callback(e || 'account not found');
		}
	});
}

exports.validatePasswordKey = function (passKey, ipAddress, callback) {
// ensure the passKey maps to the user's last recorded ip address //
	users.findOne({passKey:passKey, ip:ipAddress}, callback);
}

/*
	record insertion, update & deletion methods
*/

exports.updateAccount = function(id,newData, callback)
{
	users.findOne({email:newData.email}, function(e, o) {
		if (o && o._id != id) {
			console.log(newData.email + " is taken!");
			callback('email-taken');
		}
		else
		{
			users.findOne({_id:getObjectId(id)}, function(e, o) {
				if(newData.pass != "")
				{
					saltAndHash(newData.pass, function(hash){
						o.pass = hash;
						o.name = newData.name;
						o.email = newData.email;
						users.findOneAndUpdate({_id:getObjectId(id)}, {$set:o}, {returnOriginal : false}, callback(null,o));
					});
				}
				else
				{
					o.name = newData.name;
					o.email = newData.email;
					users.findOneAndUpdate({_id: getObjectId(id)}, {$set: o}, {returnOriginal: false}, callback(null, o));
				}
			});
		}
	});
}

exports.updatePassword = function(passKey, newPass, callback)
{
	saltAndHash(newPass, function(hash){
		newPass = hash;
		users.findOneAndUpdate({passKey:passKey}, {$set:{pass:newPass}, $unset:{passKey:''}}, {returnOriginal : false}, callback);
	});
}

exports.deleteAccount = function(id, callback)
{
	console.log("The user has been deleted!");
	users.deleteOne({_id: getObjectId(id)}, callback);
}

exports.AddFiles = function(id,newData, files, callback)
{
	users.findOne({_id:getObjectId(id)}, function(e, o) {
		if (!o) {
			console.log("User Not Found - Cant Upload!");
			callback('not-found');
		}
		else
		{
			for(var i=0; i<files.length; i++)
			{
				var fileobj = {};
				var now = new Date();
				if(newData.month == null)
				{
					fileobj.dir = now.toLocaleString('en-US', {month: 'long'}) + " - " + now.getFullYear();
				}
				else
				{
					fileobj.dir = newData.month;
				}
				fs.mkdir("./app/public/users/"+o._id+"/"+fileobj.dir,{recursive: true},  function (err){if(err) console.log('error', err);});
				fileobj.name = files[i].originalname;
				fileobj.commit = newData.commit;
				fileobj.date = now;
				fileobj.src = "./app/public/users/"+o._id+"/"+fileobj.dir+"/"+now.toDateString().split(" ")[2] + "-" + now.toDateString().split(" ")[1] + "-" + now.toDateString().split(" ")[3] + " - H" + now.getHours() + "M" + now.getMinutes() + "S" + now.getSeconds()+".pdf";
				fs.writeFile(fileobj.src, files[i].buffer,  function (err){if(err) console.log('error', err);});
				o.files.push(fileobj);
			}
			users.findOneAndUpdate({_id: getObjectId(id)}, {$set: o}, {returnOriginal: false}, callback(null, o));
		}
	});
}

exports.deleteFile = function(id,file, callback)
{
	users.findOne({_id:getObjectId(id)}, function(e, o) {
		if (!o) {
			console.log("User Not Found - Cant Delete!");
			callback('not-found');
		}
		else
		{
			for(var i=0; i<o.files.length; i++)
			{
				if(o.files[i].src == file)
				{
					o.files.splice(i, 1);
					break;
				}
			}
			fs.unlink(file, (err) => {
				if (err) {
					console.error(err)
				} else {
					users.findOneAndUpdate({_id: getObjectId(id)}, {$set: o}, {returnOriginal: false}, callback(null, o));
				}
			});
		}
	});
}

exports.EditSettings = function(id,newData, callback)
{
	users.findOne({_id:getObjectId(id)}, function(e, o) {
		if(o)
		{
			o.accmail = newData.accmail;
			o.signature = newData.signature;
			users.findOneAndUpdate({_id: getObjectId(id)}, {$set: o}, {returnOriginal: false}, callback(null, o));
		}
		else
		{
			callback(e);
		}
	});
}



/*exports.deleteAllAccounts = function(callback)					// if we want to restart the database
{
	accounts.deleteMany({}, callback);
};*/

/*
	private encryption & validation methods
*/

var generateSalt = function()
{
	var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
	var salt = '';
	for (var i = 0; i < 10; i++) {
		var p = Math.floor(Math.random() * set.length);
		salt += set[p];
	}
	return salt;
}

var md5 = function(str) {
	return crypto.createHash('md5').update(str).digest('hex');
};

var saltAndHash = function(pass, callback)
{
	var salt = generateSalt();
	callback(salt + md5(pass + salt));
};

var validatePassword = function(plainPass, hashedPass, callback)
{
	var salt = hashedPass.substr(0, 10);
	var validHash = salt + md5(plainPass + salt);
	callback(null, hashedPass === validHash);
};

var getObjectId = function(id)
{
	return new require('mongodb').ObjectID(id);
};
