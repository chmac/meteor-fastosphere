
/*
{"name":"255kb:meteor-status","version":"1.2.0","totalAdds":1,"directAdds":1}
{"name":"3stack:country-codes","version":"0.1.1","totalAdds":1,"directAdds":1}
{"name":"3stack:idle-watcher","version":"0.1.1","totalAdds":27,"directAdds":0}
{"name":"3stack:match-library","version":"1.0.3","totalAdds":2,"directAdds":2}
{"name":"3stack:presence","version":"1.0.3","totalAdds":1,"directAdds":1}
{"name":"3stack:prototype-string","version":"0.0.1","totalAdds":6,"directAdds":6}
{"name":"3stack:remodal","version":"1.0.2","totalAdds":1,"directAdds":1}
{"name":"3stack:spin","version":"2.0.2","totalAdds":1,"directAdds":1}
{"name":"416serg:uber","version":"0.0.1","totalAdds":1,"directAdds":1}
{"name":"abdj:autoform-file","version":"0.2.0","totalAdds":1,"directAdds":1}
*/


var meteorstatUpdateInProgress = false;

meteorstatUpdate = function (date) {
  if(meteorstatUpdateInProgress) return console.log('METEORSTAT: Update already in progress');
  meteorstatUpdateInProgress = true;

  // get meteor stats

  if(!date) date = moment().add(-1, 'days');

  console.log('METEORSTAT: Updating packages from Meteor...', date.toString());

  try {
    var res = HTTP.get('http://packages.meteor.com/stats/v1/' + date.format('YYYY-MM-DD'));
  } catch(e) {
    console.error('  METEORSTAT: Exception', e);
  }

  if(!res || res.statusCode !== 200) {
    console.error('  METEORSTAT: Cannot get stat', res);
  } else {
    var jsons = res.content.split('\n');
    _.each(jsons, function(json) {
      if(json.length < 1) return;
      var p = JSON.parse(json);
      var cp = Packages.findOne({ name: p.name });
      if(cp) {
        Packages.update(cp._id, {
          $set: { updateAlgolia: true },
          $inc: { 'meteorstat.totalAdds': p.totalAdds, 'meteorstat.directAdds': p.directAdds }
        });
      } else {
        console.error('METEORSTAT: Package is in meteorstat but not in my collection ignore it', p.name);
      }
    });
  }

  console.log('METEORSTAT: Updated');
  if(!date) algoliaUpdate(false);
  meteorstatUpdateInProgress = false;
};

meteorstatReset = function () {
  Packages.update({}, { $unset: { meteorstat: '' } }, { multi: true });

  var date = moment('2014-08-20');

  while (true) {
    meteorstatUpdate(date);
    date = date.add(1, 'days');
    if(moment().diff(date) < 0) break;
  }
  algoliaUpdate(false);
};

SyncedCron.add({
  name: 'METEORSTAT: Update',
  schedule: function(parser) {
    return parser.text('every 24 hours');
  },
  job: function() {
    var before = moment();
    meteorstatUpdate();
    return 'METEORSTAT: Took' + moment().diff(before)/1000 + ' seconds';
  }
});


Meteor.methods({
  meteorstatUpdate: function () {
    if(isAdmin(this.userId)) {
      meteorstatUpdate();
    }
  },
  meteorstatReset: function () {
    if(isAdmin(this.userId)) {
      meteorstatReset();
    }
  },
});


//meteorstatUpdate();
//meteorstatReset();
