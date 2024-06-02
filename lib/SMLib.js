class SMLib {
	_fetchUrl = 'https://script.google.com/macros/s/AKfycbwDmyGYn0W7UQPEiDiVzqv35qTigkn-RsGA0FdHNXsROchisP_6_Og0-DNHi0Z2kGsRnw/exec';
	_isLoading = false;
	_today = new Date();
	_sleep = 0;
	_isDebug = false;

	constructor(refreshCallback) {
		this._refreshCallback = refreshCallback;
		this._storageData = new StorageData("scrumMasterCachedData");
		this._isLoading = true;
	}

	async startRefresh() {
		try {
			let start = new Date();
			this._refreshCallback();
			const response = await fetch(this._fetchUrl);
			const text = response.text();
			if (this._sleep > 0) {
				await this.sleep(this._sleep);
			}
			this._isLoading = false;
			const jsonData = JSON.parse((await text).toString());
			this._storageData.cashData = JSON.parse(JSON.stringify(jsonData));
			this._refreshCallback();
			let end = new Date();
			if (this._isDebug) {
				console.log(`refreshed and loaded by ${end - start}ms, at ${end.toISOString()}`);
			}
		} catch (exception) {
			console.error("error in fetching data", exception);
		}
	}

	async sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}


	get today() {
		return new Date(this._today);
	}

	set today(value) {
		this._today = value;
	}

	get data() {
		return this._storageData.cashData;
	}

	get isLoading() {
		return this._isLoading;
	}

	get isInitializing() {
		return this._isLoading && !this.hasCashedData;
	}

	get hasCashedData() {
		return this._storageData.hasCashedData;
	}

	get cashDataNotAllowed() {
		return this._storageData.cashDataNotAllowed;
	}

	get dayRules() {
		let dayRules = (this.data.dayRules ? this.data.dayRules : [])
			.map(item => ({
				memberId: item.memberId,
				type: item.type,
				start: new Date(item.start).justDate(),
				end: new Date(item.end).justDate(),
				approved: item.approved,
				reason: item.reason
			}))
			.sort((a, b) => a.start.toDateString().localeCompare(b.start.toDateString()));

		const groupByMemberId = dayRules.reduce((acc, item) => {
			if (!acc[item.memberId + item.type]) {
				acc[item.memberId + item.type] = [];
			}
			acc[item.memberId + item.type].push(item);
			return acc;
		}, {});

		const result = Object.entries(groupByMemberId).map(([memberType, records]) => {
			let currentRecord = records[0];
			let currentStart = records[0].start;
			let currentEnd = records[0].end;
			const mergedList = [];

			for (let i = 1; i < records.length; i++) {
				const record = records[i];
				if (record.start.getPreviousWorkDay().toDateString() === currentEnd.toDateString()) {
					currentRecord = record;
					currentEnd = record.end;
				} else if (record.start.isBetween(currentStart, currentEnd)) {
					currentRecord = record;
					if (record.end > currentEnd) {
						currentEnd = record.end;
					}
				} else {
					mergedList.push({
						memberId: currentRecord.memberId,
						type: currentRecord.type,
						start: currentStart,
						end: currentEnd,
						approved: currentRecord.approved,
						reason: currentRecord.reason
					});
					currentRecord = record;
					currentStart = record.start;
					currentEnd = record.end;
				}
			}

			mergedList.push({
				memberId: currentRecord.memberId,
				type: currentRecord.type,
				start: currentStart,
				end: currentEnd,
				approved: currentRecord.approved,
				reason: currentRecord.reason
			});
			return mergedList;
		});

		let finalResult = [];
		result.forEach(x => x.forEach(y => finalResult.push(y)));
		return finalResult.sort((a, b) => b.start.toDateString().localeCompare(a.start.toDateString()));
	}

	get replacement() {
		return this.dayRules.filter(item => item.type === "Replacement");
	}

	get vacations() {
		return this.dayRules.filter(item => item.type === "Vacation");
	}

	get holidays() {
		return (this.data.holidays ? this.data.holidays : [])
			.map(item => ({
				date: new Date(item.date).justDate(),
				name: item.name
			}));
	}

	get whosOut() {

		function isFinished(end, today) {
			return end < today;
		}

		return this.vacations
			.filter(item => item.end >= this._today.addDays(-15) && item.start <= this._today.addDays(60))
			.map(item => (
				{
					start: item.start,
					end: item.end,
					memberId: item.memberId,
					reason: item.reason,
					approved: item.approved,
					status: this._today.isBetween(item.start, item.end)
						? 0
						: isFinished(item.end, this._today)
							? -1 : 1
				}
			))
			.sort((a, b) => a.status !== b.status ? a.status - b.status : a.start - b.start);
	}

	get teamMembers() {
		return (this.data.teamMembers ? this.data.teamMembers : [])
			.filter(item => item.status === "Active")
			.sort((a, b) => a.peekOrder - b.peekOrder)
			.map(item => (
				{
					memberId: item.memberId,
					name: item.name,
					shortName: item.shortName,
					status: item.status,
					peekOrder: item.peekOrder,
					dayBackup: item.dayBackup,
					backupMembers: item.backupMembers && item.backupMembers.trim() !== ''
						? item.backupMembers.split(',').map(m => m.trim())
						: []
				}));
	}

	get firstWeekTeamMembers() {
		let memberIndex = 0;
		const members = [];
		const tempTeamMembers = [...this.teamMembers];
		if (tempTeamMembers.length > 0) {
			while (members.length < 5) {
				const member = tempTeamMembers[memberIndex];
				members.push(member.memberId)
				if (member.dayBackup) {
					memberIndex++;
				} else {
					tempTeamMembers.splice(memberIndex, 1);
				}
				if (memberIndex >= tempTeamMembers.length) {
					memberIndex = 0;
				}
			}
		}
		return members;
	}

	get secondWeekTeamMembers() {
		let memberIndex = 0;
		const members = [];
		const teamMembers = this.teamMembers;
		if (teamMembers.length > 0) {
			const firstWeekTeamMembers = this.firstWeekTeamMembers;
			const restOfTeamMembers = teamMembers
				.filter(member => !firstWeekTeamMembers.includes(member.memberId))
				.concat(teamMembers
					.filter(member => firstWeekTeamMembers.includes(member.memberId))
					.filter(member => member.dayBackup)
				);
			const tempTeamMembers = [...restOfTeamMembers];
			while (members.length < 5) {
				let member = tempTeamMembers[memberIndex];
				if (member) {
					members.push(member.memberId)
					if (member.dayBackup) {
						memberIndex++;
					} else {
						tempTeamMembers.splice(memberIndex, 1);
					}
					if (memberIndex >= tempTeamMembers.length) {
						memberIndex = 0;
					}
				} else {
					members.push("");
				}
			}
		}
		return members;
	}

	get twoWeekTeamMembers() {
		return this.firstWeekTeamMembers.concat(this.secondWeekTeamMembers);
	}

	getTeamMember(memberId) {
		return this.teamMembers
			.filter(item => item.memberId === memberId)[0];
	}

	isOnVacation(date, memberId) {
		return this.vacations.some(v => v.memberId === memberId && date >= v.start && date < v.end.addDays(1));
	}

	currentHoliday(date) {
		return this.holidays.filter(h => h.date.toDateString() === date.toDateString());
	}

	isHoliday(date) {
		const filter = this.currentHoliday(date);
		return filter.length > 0;
	}

	getHolidayName(date) {
		return this.currentHoliday(date)[0].name;
	}

	getFirstFreeBackup(date, memberId) {
		const member = this.getTeamMember(memberId);
		
		function getDateSeed(date) {
			return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
		}

		function hashCode(str) {
			let hash = 0;
			for (let i = 0; i < str.length; i++) {
				let char = str.charCodeAt(i);
				hash = ((hash << 5) - hash) + char;
				hash = hash & hash; // Pretvori u 32-bitni integer
			}
			return hash;
		}

		if (member) {
			const backupMembers = member.backupMembers;
			if (backupMembers.length > 0) {
				for (let backupMemberId of backupMembers) {
					if (!this.isOnVacation(date, backupMemberId)) {
						return backupMemberId;
					}
				}
			}
		}
		let seed = getDateSeed(date);
		let shuffledTeamMembers = this.shuffleArray([...this.teamMembers], seed);
		// console.log("shuffle", date, shuffledTeamMembers, seed);
		for (let member of shuffledTeamMembers) {
			if (!this.isOnVacation(date, member.memberId)) {
				return member.memberId;
			}
		}
		return null;
	}

	shuffleArray(array, seed) {
		function lcg(seed) {
			const m = 0x80000000;
			const a = 1103515245;
			const c = 12345;

			let state = seed ? seed : Math.floor(Math.random() * (m - 1));

			return function() {
				state = (a * state + c) % m;
				return state / (m - 1);
			};
		}

		let random = lcg(seed);

		let randomIndex = Math.floor(random() * array.length);
		let firstElement = array[randomIndex];
		let restArray = array.slice(0, randomIndex).concat(array.slice(randomIndex + 1));

		// Fisher-Yates algoritam za mešanje
		for (let i = restArray.length - 1; i > 0; i--) {
			let j = Math.floor(random() * (i + 1));
			[restArray[i], restArray[j]] = [restArray[j], restArray[i]]; // Zamena elemenata
		}

		return [firstElement, ...restArray];
	}

	isBeforeToday(date) {
		return date < this._today;
	}

	isToday(date) {
		return this.today.isEqual(new Date(date));
	}

	getScrumMaster(currentDate, memberIndex) {
		let scrumMasterId = this.twoWeekTeamMembers[memberIndex];
		const replacementScrumMaster = getReplacementScrumMaster(currentDate);
		if (replacementScrumMaster != null) {
			scrumMasterId = replacementScrumMaster.memberId;
		}
		if (scrumMasterId === "" || this.isOnVacation(currentDate, scrumMasterId)) {
			scrumMasterId = this.getFirstFreeBackup(currentDate, scrumMasterId);
		}
		return this.getTeamMember(scrumMasterId)
	}

	getScrumMasterName(currentDate, memberIndex) {
		if (this.isInitializing) {
			return "initializing...";
		} else {
			const scrumMaster = this.getScrumMaster(currentDate, memberIndex);
			if (scrumMaster) {
				return scrumMaster.name;
			} else {
				return "Unknown";
			}
		}
	}

	millisecondsUntil(hours, minutes, seconds, now) {
		const targetTime = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			hours,
			minutes,
			seconds
		);

		let msUntilRefresh = targetTime.getTime() - now.getTime();
		if (msUntilRefresh <= 0)
			msUntilRefresh += 24 * 60 * 60 * 1000;

		return msUntilRefresh
	}

	reloadAt(hoursMinutesSeconds) {
		const now = new Date();
		console.log("now", now.toString());
		const that = this;
		const times = [];
		let hoursMinutesSecondsList = hoursMinutesSeconds.split(", ").map(x => x.trim());
		hoursMinutesSecondsList.forEach(time => {
			let msUntilRefresh;
			if (time[0] === "+") {
				if (time.includes(":")) {
					let [hours, minutes = 0, seconds = 0] = time.split(":").map(Number);
					msUntilRefresh = (((hours * 60) + minutes) * 60 + seconds) * 1000;
				} else {
					msUntilRefresh = Number(time) * 60 * 1000;
				}	
			} else {
				let [hour, minute = 0, seconds = 0] = time.split(":").map(Number);
				msUntilRefresh = this.millisecondsUntil(hour, minute, seconds, now);
			}
			const exactTime = `[${time}][${msUntilRefresh}] = ${new Date().addMilliseconds(msUntilRefresh).toString()}`;
			setTimeout(function () {
				that.startRefresh().then(() => console.log(`${exactTime} called at`, new Date().toString()));
			}, msUntilRefresh);
			times.push(exactTime);
			console.log("time", exactTime);
		})
		console.log("times", times.join(", "));
	}
}