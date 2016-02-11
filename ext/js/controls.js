 ;

controls = {
	hideControlsTimeout: null,
	video: null,
	$video: null,
	$ctrls: null,
	cue_style: null,
	subtitles_size: 1,
	subtitles_size_cast: 1,
	init: function ()
	{
		controls.video = document.getElementById("video");
		controls.$video = $(controls.video);
		controls.$ctrls = $('#controls');

		$(window).resize(function ()
		{
			controls.$video.css('width', $('#main_area').width());
			controls.$video.css('height', $('#main_area').height());
		}).trigger('resize');

		$('#welcome input[name="magnet_url"]').on('change keyup keydown', function ()
		{
			var url = $(this).val();
			if (url.match(/^magnet:*/))
				app.start_video(url);
			else
				$(this).val('');
		});

		$('#welcome [name="manual_video_file"]:file').change(function (e)
		{
			if (e.target.files[0])
			{
				$('#status').hide();
				app.start_video_local(e.target.files[0]);
			}
		});
		$('#welcome #manual_video_file_button').click(function (e)
		{
			$('#welcome [name="manual_video_file"]:file').trigger('click');
		});

		controls.video.oncanplay = function ()
		{
			background.stop();
			$('#loader, #welcome, #help_link, #logo').slideUp();
			$('#player').slideDown();
		};

		controls.$video.on('playing play waiting pause mousemove', function ()
		{
			controls.toggle_controls(true);
		});

		//subtitles font size
		controls.cue_style = document.getElementById('subs_style').sheet.cssRules[0].style;
		chrome.storage.local.get(['subtitles_size', 'subtitles_size_cast'], function (data)
		{
			if ('subtitles_size' in data)
			{
				controls.subtitles_size = (data['subtitles_size']); //support for previous values
				controls.cue_style.setProperty('font-size', controls.subtitles_size + 'em', null);
			}
			if ('subtitles_size_cast' in data)
				controls.subtitles_size_cast = data['subtitles_size_cast'];
		});

		controls.controls_handlers();
	},
	toggle_controls: function (on)
	{
		if (true === on)
		{
			$('#status').css('opacity', 1);
			controls.$ctrls.show();
			controls.$video.css({cursor: 'default'});

			controls.hideControlsTimeout && clearTimeout(controls.hideControlsTimeout);
			if (!controls.video.paused)
			{
				controls.hideControlsTimeout = window.setTimeout(function ()
				{
					controls.toggle_controls(false);
				}, 3000);
			}
		}
		else
		{
			$('#status').css('opacity', 0);
			controls.$ctrls.hide();
			controls.$video.css({cursor: 'none'});
		}
	},
	controls_handlers: function ()
	{
		function seek_relative(span)
		{
			if (cast.media)
			{
				var request = new chrome.cast.media.SeekRequest();
				request.currentTime = cast.media.getEstimatedTime() + span;
				console.log(request.currentTime);
				cast.media.seek(request);
			}
			else
			{
				if (controls.video.readyState < 2) //http://www.w3schools.com/tags/av_prop_readystate.asp
					return;
				controls.video.currentTime += span;
			}
		}

		//keyboard
		$(document).on('keydown', function (e)
		{
			switch (e.keyCode)
			{
				case 32: //space
					controls.$ctrls.find('#btn_play_pause').trigger('click');
					break;
				case 39: //right arrow
					seek_relative(10);
					break;
				case 37: //left arrow
					seek_relative(-10);
					break;
				case 38: //up arrow
					seek_relative(60);
					break;
				case 40: //down arrow
					seek_relative(-60);
					break;
			}
		});

		//progress bar
		controls.$video.on('timeupdate', function ()
		{
			controls.$ctrls.find('#time').text(controls.seconds_to_hhmmss(controls.video.currentTime) + ' / ' + controls.seconds_to_hhmmss(controls.video.duration));
			controls.$ctrls.find('#time_bar #percentage').css('width', (controls.video.currentTime * 100 / controls.video.duration) + '%');
		});
		controls.$ctrls.find('#time_bar').mouseup(function (e)
		{
			var new_time = e.offsetX / $(this).width() * controls.video.duration;
			if (cast.media)
			{
				var request = new chrome.cast.media.SeekRequest();
				request.currentTime = new_time;
				cast.media.seek(request);
			}
			else
				controls.video.currentTime = new_time;
		});
		controls.$ctrls.find('#time_bar').mousemove(function (e)
		{
			$('#time_bar #goto').css('width', (e.offsetX * 100 / $(this).width()) + '%');
		});
		controls.$video.on('durationchange', function ()
		{
			$('#time').text(controls.seconds_to_hhmmss(controls.video.currentTime) + ' / ' + controls.seconds_to_hhmmss(controls.video.duration));
		});
		controls.$video.on('progress', function ()
		{
			var $bg_bar = $('#time_bar #bg');
			$bg_bar.html('');
			for (var i = 0; i < controls.video.buffered.length; i++)
			{
				$bg_bar.append(
					$('<div></div>').css({
						left: (controls.video.buffered.start(i) * 100 / controls.video.duration) + '%',
						width: ((controls.video.buffered.end(i) - controls.video.buffered.start(i)) * 100 / controls.video.duration) + '%'
					})
				);
			}
		});

		//pause/play button
		controls.$ctrls.find('#btn_play_pause').click(function ()
		{
			if (cast.media)
			{
				if (cast.media.playerState === "PLAYING")
					cast.media.pause();
				else
					cast.media.play();
			}
			else
			{
				if (controls.video.readyState < 2) //http://www.w3schools.com/tags/av_prop_readystate.asp
					return;
				controls.video.paused ? controls.video.play() : controls.video.pause();
			}
		});
		//video click play/pause
		$('#video, #casting_bg').click(function ()
		{
			controls.$ctrls.find('#btn_play_pause').trigger('click');
		});
		controls.$video.on('play pause', function ()
		{
			controls.$ctrls.find('#btn_play_pause > span').attr('class', controls.video.paused ? 'icon-play3' : 'icon-pause2');
		});

		//volume
		var last_vol = controls.video.volume;
		controls.$ctrls.find('#btn_mute').click(function ()
		{
			if (controls.video.volume > 0)
				last_vol = controls.video.volume;

			controls.$ctrls.find('#volume_bar').val(controls.video.volume > 0 ? 0 : last_vol).trigger('change');
		});
		controls.$ctrls.find('#volume_bar').change(function ()
		{
			if (cast.media)
			{
				var volume = new chrome.cast.Volume();
				volume.level = $(this).val();
				volume.muted = false;

				var request = new chrome.cast.media.VolumeRequest();
				request.volume = volume;

				cast.media.setVolume(request);
			}

			controls.video.volume = $(this).val();
			controls.mute_icon();

		}).val(controls.video.volume);

		//full screen
		controls.$ctrls.find('#btn_full_screen').click(function ()
		{
			var $icon_span = $(this).find('> span');
			if (document.webkitFullscreenElement)
			{
				document.webkitExitFullscreen();
				$icon_span.attr('class', 'icon-enlarge2');
			}
			else
			{
				controls.video.webkitRequestFullScreen();
				$icon_span.attr('class', 'icon-shrink2');
			}
		});

		//subtitles
		controls.$ctrls.find('#btn_plus').click(function ()
		{
			controls.set_font_size(true);
		});
		controls.$ctrls.find('#btn_minus').click(function ()
		{
			controls.set_font_size(false);
		});
		controls.$ctrls.find('#btn_sub_select .context_menu').on('click', 'li', function ()
		{
			var $li = $(this);
			if ($li.hasClass('manual'))
			{
				$('[name="manual_subtitles_file"]:file').trigger('click');
			}
			else
			{
				$li.siblings().removeClass('active');
				$li.addClass('active');

				var sub_data = $li.data();
				chrome.storage.local.set({prefered_sub_lang: sub_data.language || null}); //assuming the user will always use the same subtitles language...
				subs.set_srt(controls.video, sub_data.sub_id, sub_data.encoding);
			}
		});
		$('[name="manual_subtitles_file"]:file').change(function (e)
		{
			if (e.target.files[0])
			{
				controls.$ctrls.find('#btn_sub_select .context_menu li').removeClass('active').filter('.manual').addClass('active');
				subs.set_srt(controls.video, 'manual', null, e.target.files[0]);
				e.target.value = ''; //make sure the change event will trigger if the user chooses the previous file again
			}
		});

		controls.$ctrls.find('#btn_cast').click(function ()
		{
			controls.video.pause();
			cast.load_media();
		});
	},
	cast_progress_timer: null,
	cast_time: null,
	controls_update_from_cast: function (isAlive)
	{
		if (!isAlive)
			return;

		console.log('controls_update_from_cast', cast.media);

		controls.$ctrls.find('#btn_play_pause > span').attr('class', cast.media.playerState === "PLAYING" ? 'icon-pause2' : 'icon-play3');
		controls.$ctrls.find('#volume_bar').val(cast.media.volume.level);

		if (cast.media.playerState === "PLAYING")
		{
			if (controls.cast_progress_timer)
				return;

			controls.cast_progress_timer = setInterval(function ()
			{
				if (!cast.media)
				{
					clearInterval(controls.cast_progress_timer);
					controls.cast_progress_timer = null;
					return;
				}

				controls.cast_time = cast.media.getEstimatedTime();
				controls.$ctrls.find('#time').text(controls.seconds_to_hhmmss(controls.cast_time) + ' / ' + controls.seconds_to_hhmmss(cast.media.media.duration));
				controls.$ctrls.find('#time_bar #percentage').css('width', (controls.cast_time * 100 / cast.media.media.duration) + '%');
			}, 1000);
		}
		else
		{
			clearInterval(controls.cast_progress_timer);
			controls.cast_progress_timer = null;
		}
	},
	controls_fill_sub: function (srts)
	{
		chrome.storage.local.get(['prefered_sub_lang'], function (data)
		{
			var $srt_li_to_load = null;
			var $cm = controls.$ctrls.find('#btn_sub_select').find('.context_menu');
			$.each(srts, function (i, srt)
			{
				if (i === 0)
				{
					document.title = srt.MovieName + ' - Bit Player';
					$('#window_title').html(document.title);
				}

				var $li = $('<li></li>').text(srt.MovieReleaseName + ' (' + srt.LanguageName + ')').data({
					sub_id: srt.IDSubtitleFile,
					language: srt.SubLanguageID,
					encoding: srt.SubEncoding
				});

				$cm.append($li);

				if (!$srt_li_to_load && data.prefered_sub_lang === srt.SubLanguageID)
					$srt_li_to_load = $li;
			});
			$srt_li_to_load && $srt_li_to_load.trigger('click');
		})
	},
	mute_icon: function ()
	{
		var vol = controls.video.volume;
		var $icon_span = controls.$ctrls.find('#btn_mute > span');
		if (vol == 0)
			$icon_span.attr('class', 'icon-volume-mute2');
		else if (vol > 0.66)
			$icon_span.attr('class', 'icon-volume-high');
		else if (vol > 0.3)
			$icon_span.attr('class', 'icon-volume-medium');
		else
			$icon_span.attr('class', 'icon-volume-low');
	},
	seconds_to_hhmmss: function (totalSeconds)
	{
		var hours = Math.floor(totalSeconds / 3600);
		var minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
		var seconds = totalSeconds - (hours * 3600) - (minutes * 60);
		seconds = seconds.toFixed(0);

		var result = hours ? (hours < 10 ? "0" + hours : hours) + ':' : '';
		result += (minutes < 10 ? "0" + minutes : minutes);
		result += ":" + (seconds < 10 ? "0" + seconds : seconds);
		return result;
	},
	set_font_size: function (increase)
	{
		if (cast.media)
		{
			controls.subtitles_size_cast = Math.min(Math.max(controls.subtitles_size_cast + (increase ? 0.1 : -0.1), 0.5), 3); //keeping size between 0.5 and 3
			chrome.storage.local.set({'subtitles_size_cast': controls.subtitles_size_cast});

			cast.media.editTracksInfo(new chrome.cast.media.EditTracksInfoRequest(null, cast.sub_style(controls.subtitles_size_cast)));
		}
		else
		{
			controls.subtitles_size = Math.min(Math.max(controls.subtitles_size + (increase ? 0.1 : -0.1), 0.5), 3); //keeping size between 0.5 and 3
			chrome.storage.local.set({subtitles_size: controls.subtitles_size});

			controls.cue_style.setProperty('font-size', controls.subtitles_size + 'em', null);
		}
	}
};