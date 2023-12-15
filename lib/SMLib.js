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
				console.log(`refreshed and loaded by ${end - start}ms`);
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
				if (record.start.addDays(-1).toDateString() === currentEnd.toDateString()) {
					currentRecord = record;
					currentEnd = record.end;
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
		function isBetween(start, end, today) {
			return start <= today && end.addDays(1) > today;
		}

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
					status: isBetween(item.start, item.end, this._today)
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
		const backupMembers = this.getTeamMember(memberId).backupMembers;

		function getDateSeed(date) {
			return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
		}

		if (backupMembers.length > 0) {
			for (let backupMemberId of backupMembers) {
				if (!this.isOnVacation(date, backupMemberId)) {
					return backupMemberId;
				}
			}
		}
		let seed = getDateSeed(date);
		let shuffledTeamMembers = this.shuffleArray([...this.teamMembers], seed);
		for (let member of shuffledTeamMembers) {
			if (!this.isOnVacation(date, member.memberId)) {
				return member.memberId;
			}
		}
		return null;
	}

	shuffleArray(array, seed) {
		let currentIndex = array.length, temporaryValue, randomIndex;

		function seededRandom() {
			const x = Math.sin(seed++) * 10000;
			return x - Math.floor(x);
		}

		while (0 !== currentIndex) {

			randomIndex = Math.floor(seededRandom() * currentIndex);
			currentIndex -= 1;

			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
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
		if (this.isOnVacation(currentDate, scrumMasterId)) {
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
}