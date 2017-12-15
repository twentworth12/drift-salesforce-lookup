# Salesforce Lookup for Drift
Salesforce Lookup for Drift

This app looks up the current person we're chatting with in Salesforce and returns a link along with some useful information about them right inside Drift.

You can find your Drift OAuth Access token at dev.drift.com
![OAuth token](https://d1ax1i5f2y3x71.cloudfront.net/items/073z1y1f3Q2F28381M3J/%5B8fbf40aa6cdb4864f1a68d0bc9e04eff%5D_Screen+Shot+2017-11-17+at+9.31.53+AM.png?X-CloudApp-Visitor-Id=2789091&v=7439000e)

## Deploying to Heroku

Take a look at these steps from Drift to setup Heroku https://github.com/Driftt/Driffy

Make sure you set these tokens

DRIFT_TOKEN = {Your Drift OAuth Token}
SF_TOKEN = {Your Salesforce OAuth Token}

### Linking to dev.drift.com

Take a look at these steps from Drift to setup your app https://github.com/Driftt/Driffy

### Customizing what you return from Salesforce

You can return whatever you'd like from Salesforce into Drift by updating the SOQL query and then adding the results to the body variable. 
