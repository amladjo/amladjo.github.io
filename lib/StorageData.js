class StorageData {
    _cashDataName = "scrumMasterCachedData";
    _cashDataExpiredName = "scrumMasterCachedDataExpired";
    _cashExpiredDate = new Date();
    _cashExpiredInDays = 1;
    _cashDataNotAllowed = false;
    _data = {
        dayRules: [],
        holidays: [],
        teamMembers: []
    };

    constructor(cashDataName) {
        this._cashDataName = cashDataName;
        this.readData();
    }

    readData() {
        try {
            let cashExpiredDateAsISOString;
            try {
                cashExpiredDateAsISOString = localStorage.getItem(this._cashDataExpiredName);
            } catch (e) {
                console.error("Local storage data is permitted", e);
                this._cashDataNotAllowed = true;
                return;
            }

            let cashExpiredDate = this._cashExpiredDate;
            if (cashExpiredDateAsISOString) {
                cashExpiredDate = new Date(cashExpiredDateAsISOString);
            }
            const now = new Date();
            if (cashExpiredDate < now.addDays(-this._cashExpiredInDays)) {
                this._hasCashedData = false;
                return;
            }

            const cachedData = localStorage.getItem(this._cashDataName);
            if (cachedData) {
                this._hasCashedData = true;
                this._data = JSON.parse(cachedData);
            }
        } catch (e) {
            console.error("found error in readData()", e);
        }
    }

    get cashData() {
        return this._data;
    }

    set cashData(value) {
        this._data = value;
        if (!this._cashDataNotAllowed) {
            localStorage.setItem(this._cashDataName, JSON.stringify(value));
            this._cashExpiredDate = new Date();
            localStorage.setItem(this._cashDataExpiredName, this._cashExpiredDate.toISOString());
        }
    }

    get hasCashedData() {
        return this._hasCashedData;
    }
}