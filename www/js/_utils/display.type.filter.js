bulletApp.filter('displayType', function () {
  return function(input) {
    var output;
    switch(input) {
      case 'day':
        output = 'Daily Log';
        break;
      case 'month':
        output = 'Monthly Tracker';
        break;
      case 'month-cal':
        output = 'Monthly Tracker ';
        break;
      case 'future':
        output = 'Future Log';
        break;
      case 'generic':
        output = 'Custom';
        break;
      default:
        output = '';
        break;
    }
    return output
  }
})
