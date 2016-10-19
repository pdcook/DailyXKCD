Module.register("DailyXKCD",{
	
	// Default module config.
	defaults: {
		dailyJsonUrl : "http://xkcd.com/info.0.json",
		updateInterval : 10000 * 60 * 60, // 10 hours
		invertColors : false,
		titleFont : "bright large light",
		altTextFont : "xsmall dimmed light",
		limitComicHeight : 450,
		showAltText : false
	},
	
	start: function() {
		Log.info(this.config);
		Log.info("Starting module: " + this.name);
		
		this.dailyComic = "";
		this.dailyComicTitle = "";
		this.dailyComicAlt = "";
		
		this.getComic();

		if (this.config.limitComicHeight > 0)
		{
			var self = this;
			// scroll comic up and down
			this.addAutoSuspendingInterval(function() {
				self.scrollComic();
			}, 8 * 1000);
			this.scrollProgress = 0;
		}

		this.pause = false;
	},
	
	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	},
	
	// Define required styles.
	getStyles: function() {
		return ["xkcd.css"];
	},

	getComic: function() {
		Log.info("XKCD: Getting comic.");
		
		this.sendSocketNotification("GET_COMIC", {config: this.config});
	},
	
	socketNotificationReceived: function(notification, payload) {
		if(notification === "COMIC") {
			Log.info(payload.img);
			this.dailyComic = payload.img;
			this.dailyComicTitle = payload.safe_title;
			this.dailyComicAlt = payload.alt;
			this.scheduleUpdate();
		}
		
	},

	notificationReceived: function(notification, payload, sender) {
		this.checkUserPresence(notification, payload, sender);
	},
	
	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");
		
		var title = document.createElement("div");
		title.className = this.config.titleFont;
		title.innerHTML = this.dailyComicTitle;
		wrapper.appendChild(title);
		
		var comicWrapper = document.createElement("div");
		comicWrapper.className = "xkcdcontainer";
		if (this.config.limitComicHeight > 0)
		{
			comicWrapper.style.maxHeight = this.config.limitComicHeight + "px";
		}

		var xkcd = document.createElement("img");
		xkcd.className = "xkcdcontent";
		xkcd.src = this.dailyComic;
		if(this.config.invertColors){
			xkcd.setAttribute("style", "-webkit-filter: invert(100%);")
		}
		comicWrapper.appendChild(xkcd);

		wrapper.appendChild(comicWrapper);

		if (this.config.showAltText)
		{
			var alttext = document.createElement("div");
			alttext.className = this.config.altTextFont;
			alttext.innerHTML = this.dailyComicAlt;

			wrapper.appendChild(alttext);
		}

		return wrapper;
	},
	
	/* onSuspend()
	 * This method is called when a module is hidden.
	 */
	onSuspend: function() {
		this.scrollProgress = 0;

		var scrollable = document.getElementsByClassName('xkcdcontent');
		for (var i = 0; i < scrollable.length; i++)
		{
			var element = scrollable[i];
			element.style.top = 0 + "px";
		}
	},

	/* scrollComic
	 * Scrolls the comic down if needed
	 */
	scrollComic: function() {
		var scrollable = document.getElementsByClassName('xkcdcontent');
		for (var i = 0; i < scrollable.length; i++)
		{
			var element = scrollable[i];
			var height = element.naturalHeight;

			var top = 0;
			if (this.config.limitComicHeight > 0 && height > this.config.limitComicHeight)
			{
				top = Math.max(this.scrollProgress * -this.config.limitComicHeight * 0.8, this.config.limitComicHeight - height);
			}
			element.style.top = top + "px";
			element.style.height = height + "px";
			if (top == this.config.limitComicHeight - height)
			{
				this.scrollProgress = -1;
			}
		}
		this.scrollProgress += 1;
	},

	// contains auto suspending autoIntervals
	autoIntervals: [],

	/* checkUserPresence(notification, payload, sender)
	 * Use this method to conveniently suspend your module when no user is present.
	 */
	checkUserPresence: function(notification, payload, sender) {
		if (sender && notification === "USER_PRESENCE") {
			if (payload === true)
			{
				this.resumeIntervals();
			}
			else
			{
				this.suspendIntervals();
			}
		}
	},

	/* addAutoSuspendingInterval(callback, time)
	 * Use instead of setInterval for automatic pause when on suspend.
	 * The callback is executed immediately once after the user returns.
	 */
	addAutoSuspendingInterval: function(callback, time) {
		var newInterval = setInterval(callback, time);
		this.autoIntervals.push({
			callback: callback,
			interval: newInterval,
			time: time
		});
	},

	/* suspendIntervals()
	 * This method is called when a module is hidden.
	 */
	suspendIntervals: function() {
		for (var i = 0; i < this.autoIntervals.length; i++)
		{
			var current = this.autoIntervals[i];

			if (current.interval)
			{
				clearInterval(current.interval);

				current.interval = null;
			}
		}
	},

	/* resumeIntervals()
	 * This method is called when a module is shown.
	 */
	resumeIntervals: function() {
		for (var i = 0; i < this.autoIntervals.length; i++)
		{
			var current = this.autoIntervals[i];

			if (!current.interval)
			{
				current.callback();

				current.interval = setInterval(current.callback, current.time);
			}
		}
	},

	scheduleUpdate: function() {
		var self = this;
		
		self.updateDom(3000);
		
		setInterval(function() {
			self.getComic();
		}, this.config.updateInterval);
	}
	
});
