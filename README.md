## Classes

<dl>
<dt><a href="#Luminati">Luminati</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#LuminatiConfig">LuminatiConfig</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="Luminati"></a>
## Luminati
**Kind**: global class  

* [Luminati](#Luminati)
    * [new Luminati(config)](#new_Luminati_new)
    * [.getProxy()](#Luminati+getProxy) ⇒ <code>Promise</code>

<a name="new_Luminati_new"></a>
### new Luminati(config)
Luminati!!


| Param | Type |
| --- | --- |
| config | <code>[LuminatiConfig](#LuminatiConfig)</code> | 

<a name="Luminati+getProxy"></a>
### luminati.getProxy() ⇒ <code>Promise</code>
getProxy is what you call every time you need a new exit node.

**Kind**: instance method of <code>[Luminati](#Luminati)</code>  
**Returns**: <code>Promise</code> - Returns promise that resolves with string to use as proxy in your
net requests.
Note: this promise will perform a DNS lookup the first time it is called, but after
should resolve immediately. This is the entire string used as "host" when
making http requests!  
**Example**  
```js
var request = require('request');
var Luminati = require('luminati');

var luminati = new Luminati({
  username: 'myusername-zone-myzone',
  password: 'mypassword'
});

luminati.getProxy().then(proxy => {
  request({ url: 'http://coolurl.com', proxy: proxy })
   .pipe(toWherever)
});
```
<a name="LuminatiConfig"></a>
## LuminatiConfig : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| username | <code>String</code> |  | luminati username in the form USER-zone-ZONE |
| password | <code>String</code> |  | luminati password |
| frequency | <code>Number</code> | <code>60000</code> | frequency, in ms, that you want to refresh the DNS of the super-proxy you are using. |
| superProxyLocation | <code>String</code> | <code>gb</code> | country code to use for super proxy location. |
| exitLocation | <code>String</code> | <code>false</code> | country code if you want exit node to be in a specific country. If not provided, will provide exit nodes in random countries. |
| dnsResolution | <code>String</code> | <code>local</code> | can be 'local' or 'remote' - where the final url should have its DNS resolved, locally at the super proxy, or remotes at the exit node. |
| https | <code>Boolean</code> | <code>false</code> | whether you want to use an https proxy url or not. |

