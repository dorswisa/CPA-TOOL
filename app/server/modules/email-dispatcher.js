
var EM = {};
module.exports = EM;
const merge = require('easy-pdf-merge');
const fs = require('fs');

EM.server = require("emailjs/email").server.connect(
{
	host 	    : process.env.NL_EMAIL_HOST || 'smtp.gmail.com',
	user 	    : process.env.NL_EMAIL_USER || 'service.dnamovies@gmail.com',
	password    : process.env.NL_EMAIL_PASS || 'dnamovies!',
	ssl		    : true
});

EM.SendFiles = function(user, files, month, callback)
{
	var pdfs = [];
	var i;
	for(i=0;i<files.length; i++)
	{
		pdfs.push(files[i].src);
	}

	if(files.length > 1)
	{
		var dest = month !== undefined ? './app/public/users/'+user._id +'/'+month+'/combined.pdf' : './app/public/users/' +user._id +'/combined.pdf';
		merge(pdfs,dest , function (err) {
			if (err) {
				return callback(err)
			}
			var now = new Date().getDate() + "/" + (new Date().getMonth() + 1) + "/" + new Date().getFullYear();
			EM.server.send({
				from         : process.env.NL_EMAIL_FROM || 'CPA-TOOL <do-not-reply@gmail.com>',
				to           : user.accmail,
				subject      : month !== undefined ? 'Combined files from '+user.name+', for '+month : 'Combined files from '+user.name,
				text         : user.signature,
				attachment   : [{	name: month !== undefined ? 'combined-'+month+'.pdf' : now+'-combined.pdf',
					path: month !== undefined ? './app/public/users/'+user._id +'/'+month+'/combined.pdf' : './app/public/users/' +user._id +'/combined.pdf',
					type: 'application/pdf'}]
			}, callback );
		});
	}
	else
	{
		EM.SendFile(user,pdfs[0], callback);
	}
}

EM.SendFile = function(user, file, callback)
{
	var i;
	for(i=0;i<user.files.length; i++)
	{
		if(user.files[i].src == file)
		{
			break;
		}
	}
	EM.server.send({
		from         : process.env.NL_EMAIL_FROM || 'CPA-TOOL <do-not-reply@gmail.com>',
		to           : user.accmail,
		subject      : 'File from '+user.name+" , "+user.files[i].commit,
		text         : user.signature,
		attachment   : [{	name: user.files[i].name,
							path: user.files[i].src,
							type: 'application/pdf'}]
	}, callback );
}

EM.dispatchResetPasswordLink = function(account, callback)
{
	EM.server.send({
		from         : process.env.NL_EMAIL_FROM || 'CPA-TOOL <do-not-reply@gmail.com>',
		to           : account.email,
		subject      : 'CPA - Please reset your password',
		text         : 'something went wrong... :(',
		attachment   : EM.composeEmail(account)
	}, callback );
}

EM.composeEmail = function(o)
{
	let baseurl = process.env.NL_SITE_URL || 'http://localhost:3005';
	var html = "<link href='https://fonts.googleapis.com/css?family=Varela+Round' rel='stylesheet' type='text/css'>\n" +
		"\n" +
		"<td align=\"center\" valign=\"top\" style=\"font-size:11px;font-family:Arial,Verdana,sans-serif\">\n" +
		"    <table width=\"620\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" align=\"center\">\n" +
		"        <tbody><tr>\n" +
		"            <td>\n" +
		"                <table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\">\n" +
		"                    <tbody><tr>\n" +
		"                        <td style=\"text-align:left;padding:15px 0px 0px 20px\">&nbsp;</td>\n" +
		"                    </tr>\n" +
		"                </tbody></table>\n" +
		"            </td>\n" +
		"        </tr>\n" +
		"        <tr>\n" +
		"            <td style=\"padding:0 3px\">\n" +
		"                <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"border: 3px solid #F74040;width:100%;text-align:left; font-family: 'Varela Round', sans-serif;\" bgcolor=\"#ffffff\" >\n" +
		"                    <tbody><tr>\n" +
		"                        <td>\n" +
		"                            <table cellpadding=\"3\" cellspacing=\"0\" border=\"0\" height=\"100\" style=\" border-bottom: 3px solid #F74040;width:100%;height:100px\" bgcolor=\"#EBECEC\">\n" +
		"                                <tbody><tr>\n" +
		"                                    <td valign=\"middle\" style=\"width: 500px;\">\n" +
		"                                        <a href=\"http://localhost:3005\"><img src=\"https://i.ibb.co/Hh26mgn/image.png\" height=\"100\" alt=\"logo\"/>\n" +
		"                                    </td>\n" +
		"                                </tr>\n" +
		"                            </tbody></table>\n" +
		"                        </td>\n" +
		"                    </tr>\n" +
		"                    <tr>\n" +
		"                        <td valign=\"middle\">\n" +
		"                            <table cellpadding=\"20\" cellspacing=\"0\" border=\"0\" style=\"width:100%;height:250px;font-family: 'Varela Round', sans-serif\">\n" +
		"                                <tbody><tr>\n" +
		"                                    <td valign=\"top\">\n" +
		"                                        <h1 style=\"font-size:22px;color:#555555\">Reset your password<br>\n" +
		"                                            <span style=\"font-size:18px\">.Here's what you need to create a new one</span>\n" +
		"                                        </h1>\n" +
		"                                        <div style=\"color:#555555;font-size:12px;line-height:20px\">\n" +
		"                                            :We recently received a request to reset the password to your account  ";
	html += "<b><a style=\"color:#555555;font-weight:bold;text-decoration:none\" href='"+o.email+"'>"+o.email+"</a></b>";
	html += "                                            <br>\n" +
		"                                            <br>\n" +
		"                                            ):To reset your password, click on this link (or copy and paste it into your browser\n" +
		"                                            <br>\n" +
		"                                            <br>";
	html += "<b><a style=\"color:#555555;font-weight:bold;text-decoration:none\" href='"+baseurl+"/?key="+o.passKey+"'>"+baseurl+'/?key='+o.passKey+"</a></b><br><br>";
	html += ".If you did not request to reset your password, simply disregard this email. No changes will be made to your account\n" +
		"                                        </div>\n" +
		"                                    </td>\n" +
		"                                </tr>\n" +
		"                            </tbody></table>\n" +
		"                        </td>\n" +
		"                    </tr>\n" +
		"                    <tr bgcolor=\"#EBECEC\" width=\"100%\">\n" +
		"                        <td align=\"center\" valign=\"top\" style=\"font-size:11px;font-family:Arial,Verdana,sans-serif;color:#000000\">\n" +
		"                            <table cellspacing=\"0\" border=\"0\" cellpadding=\"0\" width=\"100%\" style=\" border-top: 3px solid #F74040;\">\n" +
		"                                <tbody><tr>\n" +
		"                                    <td align=\"left\" valign=\"middle\" style=\"padding:20px;font-size:11px;line-height:20px;font-family:Arial,Verdana,sans-serif;color:#000000\">\n" +
		"                                        <strong>:Important Security Notice</strong><br>\n" +
		"                                        .CPA never asks for your password or other sensitive information by email\n" +
		"                                        <br>\n" +
		"                                    </td>\n" +
		"                                </tr>\n" +
		"                            </tbody></table>\n" +
		"                        </td>\n" +
		"                    </tr>\n" +
		"                    <tr bgcolor=\"#EBECEC\" width=\"100%\">\n" +
		"                        <td align=\"center\" valign=\"top\" style=\"font-size:11px;font-family:Arial,Verdana,sans-serif;color:#666666\">\n" +
		"                            <table cellspacing=\"0\" border=\"0\" cellpadding=\"0\" width=\"100%\">\n" +
		"                                <tbody><tr>\n" +
		"                                    <td align=\"left\" valign=\"middle\" style=\"padding:10px 20px 20px 20px;font-size:12px;line-height:20px;font-family:Arial,Verdana,sans-serif;color:#000000\">\n" +
		"                                        .Replies to this email are not monitored\n" +
		"                                        <br>\n" +
		"                                        <br>\n" +
		"                                        © CPA Inc, Ofakim Israel, 87588</td>\n" +
		"                                </tr>\n" +
		"                            </tbody></table>\n" +
		"                        </td>\n" +
		"                    </tr>\n" +
		"                </tbody></table>\n" +
		"                <br>\n" +
		"                <br>\n" +
		"            </td>\n" +
		"        </tr>\n" +
		"    </tbody></table>\n" +
		"</td>";
	return [{data:html, alternative:true}];
}