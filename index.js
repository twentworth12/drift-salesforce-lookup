const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('superagent');

const DRIFT_TOKEN = process.env.BOT_API_TOKEN

// Needed to get Salesforce token
const SF_USER = process.env.SF_USER
const SF_PASS = process.env.SF_PASS

const CONVERSATION_API_BASE = 'https://driftapi.com/conversations'
const CONTACT_API_BASE = 'https://driftapi.com/contacts'

// Set this to true if you want to automatically lookup users for new conversations where we have an email address
// Turned off because there's some sort of bug
const AUTO_LOOKUP = false;


function handleMessage(orgId, data) {
  if (data.type === 'private_note') {
    const messageBody = data.body
    const conversationId = data.conversationId

    if (messageBody.startsWith('/lookup')) {
      console.log("Yeah! We found a /lookup message!")
      return getContactId(conversationId, GetContactId, orgId)
    }
  }
}


function handleConversation(orgId, data) {
    const messageBody = data.body
    const conversationId = data.id
    console.log("Yeah! We found a new conversation!")
    console.log("Conversion Id is " + conversationId)
      return getContactId(conversationId, GetContactId, orgId)
}


// Get the contact ID from Drift
function getContactId(conversationId, callbackFn, orgId) {
  request
   .get(CONVERSATION_API_BASE + `${conversationId}`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${DRIFT_TOKEN}`)
   .end(function(err, res){
       callbackFn(res.body.data.contactId, conversationId, orgId)
     });
}


function GetContactId(contactId, conversationId, orgId) { 
    return getContactEmail(contactId, GetContactEmail, conversationId, orgId);
}

// Get the email address from Drift
function getContactEmail (contactId, callbackFn, conversationId, orgId) {


	request
	  .get(CONTACT_API_BASE + `${contactId}`)
	  .set(`Authorization`, `bearer ${DRIFT_TOKEN}`)
	  .set('Content-Type', 'application/json')
	  .end(function (err, res) {
	  
	  console.log("socialProfile Email is " + res.body.data.attributes.socialProfiles.email)
	  
	  if (typeof res.body.data.attributes.email != 'undefined') {
	  	emailAddress = res.body.data.attributes.email
	  	} else 
	  	 	{  
	  	 	if (typeof res.body.data.attributes.socialProfiles.email != 'undefined') {
	  	 		emailAddress = res.body.data.attributes.socialProfiles.email
	  	 	}
	  	 }	  	
	  
			callbackFn(emailAddress, conversationId, orgId)
		 });
	}

function GetContactEmail(emailAddress, conversationId, orgId) { 
    return returnSFAccessToken(emailAddress, ReturnSFAccessToken, conversationId, orgId)
}

// Use jsforce to authenticate to Salesforce. Note your Salesforce implementation may require a different connection method
function returnSFAccessToken(emailAddress, callbackFn, conversationId, orgId) {

	var jsforce = require('jsforce');
	var conn = new jsforce.Connection({
	});

	conn.login(SF_USER, SF_PASS, function(err, userInfo) {
	  if (err) { return console.error(err); }
	  callbackFn(emailAddress, conn.accessToken, conversationId, orgId)
	});
}

function ReturnSFAccessToken(emailAddress, accessToken, conversationId, orgId) {
    return querySalesforceLead(emailAddress, accessToken, conversationId, orgId, QuerySalesforceLead)
}

// Query lead data from Salesforce. This will obviously change based on what you'd like to return back to Drift
function querySalesforceLead(emailAddress, accessToken, conversationId, orgId, callbackFn) {
	
	console.log("email address is :" + emailAddress);		  


 if (typeof emailAddress != 'undefined') {


		var jsforce = require('jsforce');
		var conn = new jsforce.Connection({
		  instanceUrl : 'https://na52.salesforce.com',
		  accessToken : accessToken
		});

		
	    var records = [];
	

		// Customize this to change the fields you return from the Lead object
		conn.query("SELECT Id, Email, Existing_Account__c, Owner.Name, FirstName, LastName, Company, Country, Academics__c, Total_RM_Studio_starts__c, Last_RM_Studio_usage__c FROM Lead where Email = '" + emailAddress + "'", function(err, result) {
		  
		  if (err) { 
		      console.log("salesforce query error");
		      return console.error(err);     
		  }


		  var firstName = result.records[0].FirstName;
		  var lastName = result.records[0].LastName;
		  var Id = result.records[0].Id;
		  var Company = result.records[0].Company;
		  var Country = result.records[0].Country;
		  var existingAccount = result.records[0].Existing_Account__c;
		  var ownerName = result.records[0].Owner.Name;

		  if (result.records[0].Last_RM_Studio_usage__c != null) {
			var lastStudioUsage = result.records[0].Last_RM_Studio_usage__c  
		  } else {
			lastStudioUsage = "None"
		  }
		  
  
		  if (result.records[0].Total_RM_Studio_starts__c != null) {
			var totalStudioStarts = result.records[0].Total_RM_Studio_starts__c 
		  } else {
			totalStudioStarts = "None"
		  }	  
		  
  
		  if (result.records[0].Academics__c != "") {
			Academic = "Yeah"
		  } else {
			Academic = "Nope"
		  }
		  		  
		 if (existingAccount != null) {
			companyResponse = "<a target='_blank' href=https://na52.salesforce.com/" + existingAccount + ">" + Company + "</a>"
		  } else {
			companyResponse = Company;
		  }
		
  
		  // Build the Drift reply body. You can make this whatever you want. 
		  body = "<a target='_blank' href=https://na52.salesforce.com/" + Id + ">" + firstName + " " + lastName + "</a> | " + companyResponse + " | " + Country + "<br/>Owned by " + ownerName + "<br/>Total RM Studio Starts: " + totalStudioStarts + " | Last RM Studio Usage: " + lastStudioUsage + "<br/>Academic: " + Academic
		  		  
		  callbackFn(body, conversationId, orgId, accessToken, existingAccount)
		     }); 

			

	} else {
		// No email address was found
		body = "Oops, we don't have an email address or the user isn't in Salesforce yet"
		callbackFn(body, conversationId, orgId, accessToken, "")
		}	
}

function QuerySalesforceLead(body, conversationId, orgId, accessToken, existingAccount) {
    return querySalesforceAccount(body, conversationId, orgId, accessToken, existingAccount, postMessage)
}

// Query Salesforce Account, if there is one. This is to check to see if there's an opportunity
function querySalesforceAccount(body, conversationId, orgId, accessToken, existingAccount, callbackFn) {
	

 if (existingAccount != null) {

		var jsforce = require('jsforce');
		var conn = new jsforce.Connection({
		  instanceUrl : 'https://na52.salesforce.com',
		  accessToken : accessToken
		});
		
	    var records = [];
	

		// Ok, there is a little cheating here. We have a custom Account field Open_Opps__c that rolls-up all opportunities in an account. 
		conn.query("SELECT Open_Opps__c FROM Account where Id = '" + existingAccount + "'", function(err, result) {
		  
		  if (err) { 
		      console.log("salesforce query error");
		      return console.error(err);     
		  }

		  var openOpportunities = result.records[0].Open_Opps__c;
		  if (openOpportunities > 0) {
		  // Add Opportunity warning to the response
		  body = body + "<br/><B>** In an Active Opportunity **</B>";
		  }
		  callbackFn(body, conversationId, orgId)
		     }); 		

			} else {
				callbackFn(body, conversationId, orgId)
				}	
}

function postMessage(body, conversationId, orgId) { 

		
    const message = {
    'orgId': orgId,
    'body': body,
    'type': 'private_prompt',
  	}
  
    
  	// Send the message
    request
    .post(CONVERSATION_API_BASE + `/${conversationId}/messages`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${DRIFT_TOKEN}`)
    .send(message)
    .catch(err => console.log(err))
        
}

app.use(bodyParser.json())
app.listen(process.env.PORT || 3000, () => console.log('salesforce-lookup listening on port 3000!'))
app.post('/api', (req, res) => {
  
  if (req.body.type === 'new_message') {
    handleMessage(req.body.orgId, req.body.data);  
  }
  if ((req.body.type === 'new_conversation') && AUTO_LOOKUP ) {
      handleConversation(req.body.orgId, req.body.data);  
  }
  
  return res.send('ok')
})
