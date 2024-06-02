Date.prototype.addYears = function(years) {
    const date = new Date(this.valueOf());
    date.setFullYear(date.getFullYear() + years);
    return date;
};

Date.prototype.addDays = function(days) {
    const date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

Date.prototype.addMonths = function(months) {
    const date = new Date(this.valueOf());
    date.setMonth(date.getMonth() + months);
    return date;
};

Date.prototype.addHours = function(hours) {
    const date = new Date(this.valueOf());
    date.setHours(date.getHours() + hours);
    return date;
};

Date.prototype.addMinutes = function(minutes) {
    const date = new Date(this.valueOf());
    date.setMinutes(date.getMinutes() + minutes);
    return date;
};

Date.prototype.addSeconds = function(seconds) {
    const date = new Date(this.valueOf());
    date.setSeconds(date.getSeconds() + seconds);
    return date;
};

Date.prototype.addMilliseconds = function(milliseconds) {
    const date = new Date(this.valueOf());
    date.setMilliseconds(date.getMilliseconds() + milliseconds);
    return date;
};

Date.prototype.toDateString = function () {
    const date = new Date(this.valueOf());
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).padStart(4, '0');
    return `${year}-${month}-${day}`;
};

function pretvoriMilisekundeUHHMMSSF(milisekundi) {
    let sati = Math.floor(milisekundi / (60 * 60 * 1000));
    let minuti = Math.floor((milisekundi % (60 * 60 * 1000)) / (60 * 1000));
    let sekundi = Math.floor((milisekundi % (60 * 1000)) / 1000);
    let milisekunde = milisekundi % 1000;

    // Formatiranje brojeva da imaju dve cifre za sati, minute i sekunde, i tri cifre za milisekunde
    let formatiraniSati = sati.toString().padStart(2, '0');
    let formatiraniMinuti = minuti.toString().padStart(2, '0');
    let formatiraneSekunde = sekundi.toString().padStart(2, '0');
    let formatiraneMilisekunde = milisekunde.toString().padStart(3, '0');

    return `${formatiraniSati}:${formatiraniMinuti}:${formatiraneSekunde}.${formatiraneMilisekunde}`;
}

Date.prototype.toTimeString = function () {
    const date = new Date(this.valueOf());
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

Date.prototype.toUTCTimeString = function () {
    const date = new Date(this.valueOf());
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

Date.prototype.toString = function () {
    const date = new Date(this.valueOf());
    return date.toISOString();
};

Date.prototype.justDate = function () {
    const tempDate = new Date(this.valueOf());
    tempDate.setHours(0, 0, 0, 0);
    return tempDate;
}

Date.prototype.getPreviousMonday = function () {
    const tempDate = new Date(this.valueOf());
    const day = tempDate.getDay();
    const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1);
    tempDate.setDate(diff);
    return tempDate;
}

Date.prototype.getPreviousWorkDay = function () {
	let date = new Date(this.valueOf()).addDays(-1);
	while (date.nonWorkingDay()) {
		date = date.addDays(-1);
	}
	return date;
}

Date.prototype.isBetween = function(start, end) {
	const date = new Date(this.valueOf());
	return start <= date && end.addDays(1) > date;
}

Date.prototype.nonWorkingDay = function() {
    const date = new Date(this.valueOf());
    return date.getDay() === 6 || date.getDay() === 0;
}

Date.prototype.isEqual = function(date) {
    const firstDate = new Date(this.valueOf());
    const secondDate = new Date(date);
    return firstDate.toString() === secondDate.toString();
}

