function copyBuffer(e)
{
	var t = new Buffer(e.length);
	return e.copy(t), t
}
function computeHash(e, t, n)
{
	function r(e, t)
	{
		for (var n = 0; n < t.length; n += 8)e = e.add(Long.fromString(Array.prototype.reverse.call(t.slice(n, n + 8)).toString("hex"), !0, 16));
		return e
	}

	var o = Long.fromString(e.toString(), !0);
	return o = r(o, t), o = r(o, n), ("0000000000000000" + o.toString(16)).substr(-16)
}
function getStreamBuffer(e)
{
	return new Promise(function (t, n)
	{
		var r = [], o = 0;
		e.on("data", function (e)
		{
			r.push(copyBuffer(e)), o += e.length
		}), e.on("end", function ()
		{
			e.destroy(), t(buffer.Buffer.concat(r, o))
		}), e.on("error", n)
	})
}
function computeFileHash(e)
{
	var t = e.createReadStream({start: 0, end: 65535}), n = e.createReadStream({
		start: e.length - 65536,
		end: e.length - 1
	});
	return Promise.all([getStreamBuffer(t), getStreamBuffer(n)]).then(function (t)
	{
		return computeHash(e.length, t[0], t[1])
	})
}
function get_lang_ids()
{
	return new Promise(function (e, t)
	{
		os.api.GetSubLanguages(function (n, r)
		{
			n ? t(n) : e(r.data)
		})
	})
}
function get_opensubtitles(e, t)
{
	t = t || {};
	var n = t && t.lang || "pol";
	return new Promise(function (r, o)
	{
		function u(t, u)
		{
			if (t)return o(t);
			var i = u.token;
			computeFileHash(e).then(function (t)
			{
				console.log("searching subtitles, hash: ", t), os.api.SearchSubtitles(function (u, a)
				{
					if (u)return o(u);
					var s = a.data && a.data.filter(function (e)
						{
							return "srt" == e.SubFormat
						});
					return s && s.length ? void os.api.DownloadSubtitles(function (e, t)
					{
						if (e)return o(e);
						gzipped_subs = new Buffer(t.data[0].data, "base64");
						var u = new stream.Readable;
						u.push(gzipped_subs), u.push(null);
						var i = u.pipe(zlib.createGunzip()), a = [], s = 0;
						i.on("data", function (e)
						{
							a.push(e), s += e.length
						}), i.on("end", function ()
						{
							var e = Buffer.concat(a, s), t = e.toString();
							if ("pol" == n && t.indexOf("�") >= 0)
							{
								var o = encoding.convert(e, "utf8", "cp1250").toString();
								o.indexOf("�") < 0 && (t = o)
							}
							r(t)
						}), i.on("error", o)
					}, i, [s[0].IDSubtitleFile]) : o({token: i, moviehash: t, subfilename: e})
				}, i, [{moviehash: t, sublanguageid: n}])
			}, o)
		}

		return t.subtitles ? r(t.subtitles) : (console.log("logging in to opensubtitles"), void os.api.LogIn(u, "emrk", "qwerty", "pol", os.ua))
	})
}
var OS = require("opensubtitles"), zlib = require("zlib"), buffer = require("buffer"), stream = require("stream"), path = require("path"), encoding = require("encoding"), Long = require("long");
os = new OS, module.exports.get_opensubtitles = get_opensubtitles, module.exports.get_lang_ids = get_lang_ids;