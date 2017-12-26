# Salesforce Lookup for Drift
Salesforce Lookup for Drift

This app looks up the current person we're chatting with in Salesforce and returns a link along with some useful information about them right inside Drift.

## Deploying to Heroku

Take a look at these steps from Drift to setup Heroku https://github.com/Driftt/Driffy

Make sure you set these tokens

DRIFT_TOKEN = {Your Drift OAuth Token}. Note you can find it at dev.drift.com.
SF_USER = {Your Salesforce User}
SF_PASS = {Your Salesforce Pass. Note that you might have to append your SF security token too...}

### Configuring Salesforce Access

I use the jsforce library to connect to Salesforce https://jsforce.github.io. In my configuration, I use a Salesforce user/pass to get a token, but your configuration may (and probably will) vary.

### Linking to dev.drift.com

Take a look at these steps from Drift to setup your app https://github.com/Driftt/Driffy

### Customizing what you return from Salesforce

You can return whatever you'd like from Salesforce into Drift by updating the SOQL query and then adding the results to the body variable. I have comments in the code to show you where. 
