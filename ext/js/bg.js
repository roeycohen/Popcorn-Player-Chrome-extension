function open_app(e)
{
	e = e || {}, chrome.storage.local.get("debug", function (n)
	{
		e.debug = n.debug || "";
		var o = Object.keys(e).map(function (n)
		{
			return n + "=" + encodeURIComponent(e[n])
		}).join("&");
		chrome.app.window.create("html/window.html?" + o, {bounds: {width: 800, height: 450}})
	})
}
chrome.app.runtime.onLaunched.addListener(function ()
{
	open_app()
}), chrome.runtime.onMessageExternal.addListener(function (e)
{
	console.log("external message received", e), "open-url" == e.command && open_app({url: e.url})
});