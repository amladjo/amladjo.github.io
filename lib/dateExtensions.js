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

Date.prototype.toDateString = function () {
    const date = new Date(this.valueOf());
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).padStart(4, '0');
    return `${year}-${month}-${day}`;
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

Date.prototype.nonWorkingDay = function() {
    const date = new Date(this.valueOf());
    return date.getDay() === 6 || date.getDay() === 0;
}

Date.prototype.isEqual = function(date) {
    const firstDate = new Date(this.valueOf());
    const secondDate = new Date(date);
    return firstDate.toString() === secondDate.toString();
}

