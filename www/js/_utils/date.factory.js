bulletApp.factory('DateFactory', function () {
    let today = moment().startOf('day').toISOString(); // TODO: make this a function (so today is always up to date)
    let yesterday = moment(today).subtract(1, 'days').toISOString();
    let thisMonth = moment().startOf('month').toISOString();

    function splitCollections(collections) {
        if (!collections.length) return [
            [],
            []
        ];
        let last = (collections[0].type === "day") ? yesterday : lastMonth();
        let split = _.partition(collections, function (c) {
            return c.title < last;
        })
        let aged = split[0].sort(chronoSort);
        let future = split[1];
        return [aged, future];
    }

    function chronoSort(a, b) {
        return new Date(a.title) - new Date(b.title);
    }

    function roundDate(date, type) {
        type = type || 'day'; // or month
        return moment(date).startOf(type).toISOString();
    }

    function display(offset, type) { //offset from today
        let display = [];
        let current = (type === 'day') ? today : thisMonth;
        for (let i = 1; i > -5; i--) {
            display.push(moment(current).subtract(i - offset, type + 's').toISOString());
        }
        if (type === 'month') type = 'future';
        return display.map((e, index) => new Collection({
            title: e,
            type: type,
            id: moment().add(index, 'milliseconds').toISOString()
        }));
    }


    function monthCal(month) {
        month = new Date(month);
        let day = month;
        let dayArray = [];
        while (day.getMonth() == month.getMonth()) {
            dayArray.push(day.toISOString());
            day = moment(day).add(1, 'days').toISOString();
            day = new Date(day);
        }
        return dayArray;
    }

    function getChoices(input) {
        let [month, day, year] = input.split(' ');
        let choices = [];
        if (!day) choices = moment.months()
        else if (!year) {
            for (let y of nextNYears(10)) {
                choices.push(`${month} ${y}`);
            }
            choices = [
                ...monthCal(moment().month(month).startOf('month'))
                .map(d => `${month} ${moment(d).date()}`),
                ...choices
            ];
        } else {
            for (let y of nextNYears(10)) {
                choices.push(`${month} ${day} ${y}`);
            }
        }
        return choices;
    }

    function convertDate(dateInput) {
        let [month, day, year] = dateInput.split(' ');
        let date = moment().month(month);
        let type = 'day';

        if(!year) {
            if(day < 32) date = date.date(day);
            else [date, type] = [roundDate(date.year(day), 'month'), 'future']
        } else date = date.date(day).year(year);
        return [roundDate(date), type];
    }

    function getWeekday(date) {
        let weekday = moment(date).isoWeekday();
        weekday = moment().isoWeekday(weekday).format('dddd')
        return weekday;
    }

    function lastMonth(currentMonth) {
        currentMonth = currentMonth || thisMonth
        return moment(currentMonth).subtract(1, 'month').toISOString()
    }

    function nextMonth(currentMonth) {
        currentMonth = currentMonth || thisMonth
        return moment(currentMonth).add(1, 'month').toISOString()
    }

    function* nextNYears(n) {
        let i = 0;
        const thisYear = moment(thisMonth).year();
        while (i < n) {
            yield thisYear + i;
            i++;
        }
    }


    return {
        display: display,
        roundDate: roundDate,
        monthCal: monthCal,
        splitCollections: splitCollections,
        getChoices: getChoices,
        convertDate: convertDate,
        today: today,
        thisMonth: thisMonth,
        lastMonth: lastMonth,
        nextMonth: nextMonth,
        getWeekday: getWeekday,
        nextNYears: nextNYears
    }
})
