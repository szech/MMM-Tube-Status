/* Magic Mirror Module: MMM-Tube-Status
 * Version: 1.0.0
 *
 * By Nigel Daniels https://github.com/nigel-daniels/
 * MIT Licensed.
 */

Module.register('MMM-Tube-Status', {

    defaults : {
        app_id : '',
        app_key : '',
        show_all : true,
        interval : 600000, // Every 10 mins

    },

    start : function() {
        Log.log('Starting module: ' + this.name);

        if (this.data.classes === 'MMM-Tube-Status') {
            this.data.classes = 'bright medium';
        }

        // Set up the local values, here we construct the request url to use
        this.loaded = false;
        this.url = 'https://api.tfl.gov.uk/Line/Mode/tube%2Cdlr%2Coverground/Status?detail=true';
        if(this.config.app_id != '' && this.config.app_key != '' ){
            this.url += '&app_id=' + this.config.app_id + '&app_key=' + this.config.app_key;
        }
        this.location = '';
        this.result = null;
        this.goodService = 0;
        this.serviceClosed = 0;


        // Trigger the first request
        this.getTubeStatusData(this);
    },

    getStyles : function() {
        return [ 'tube-status.css', 'font-awesome.css' ];
    },

    getTubeStatusData : function(that) {
        // Make the initial request to the helper then set up
        // the timer to perform the updates
        that.sendSocketNotification('GET-TUBE-STATUS', that.url);
        setTimeout(that.getTubeStatusData, that.config.interval, that);
    },

    getDom : function() {
        // Set up the local wrapper
        var wrapper = document.createElement('div');

        // If we have some data to display then build the results table
        if (this.loaded) {
            if (this.result !== null) {
                this.goodService = 0;
                this.serviceClosed = 0;

                tubeResults = document.createElement('table');
                tubeResults.className = 'tubeStatus bright';

                for (var i = 0; i < this.result.length; i++) {


                    lineRow = document.createElement('tr');

                    lineName = document.createElement('td');
                    lineName.className = 'lineName ' + this.result[i].id;
                    lineName.innerHTML = this.result[i].name;
                    lineName.innerHTML = lineName.innerHTML.replace("London Overground", "Overground");

                    lineStatus = document.createElement('td');

                    minSeverity = 20; // == Service Closed

                    for (var j = 0; j < this.result[i].lineStatuses.length; j++) {
                        if (this.result[i].lineStatuses[j].validityPeriods.length < 2) {
                            severity = this.result[i].lineStatuses[j].statusSeverityDescription;
                            severityId = this.result[i].lineStatuses[j].statusSeverity;
                            if(severityId < minSeverity) {
                                minSeverity = severityId;
                            }
                            if(!lineStatus.innerHTML.includes(severity)){
                                statusSpan = document.createElement('span');
                                if(lineStatus.innerHTML.length == 0){
                                    statusSpan.className = this.getLineStatusClass(severityId);
                                    statusSpan.innerHTML = severity;
                                } 
                                else {
                                    statusSpan.className = this.getLineStatusClass(severityId);
                                    statusSpan.innerHTML = "<br>" + severity;
                                }
                                lineStatus.appendChild(statusSpan);
                            }
                        } else {
                            for (var k = 0; k < this.result[i].lineStatuses[j].validityPeriods.length; k++) {
                                if (this.result[i].lineStatuses[j].validityPeriods[k].isNow) {
                                    severity = this.result[i].lineStatuses[j].statusSeverityDescription;
                                }
                            }
                        }
                    }
                    lineStatus.className = this.getLineStatusClass(minSeverity);

                    lineRow.appendChild(lineName);
                    lineRow.appendChild(lineStatus);


                    tubeResults = this.processTubeResults(tubeResults, lineRow);


                }
                wrapper.appendChild(tubeResults);
            } else {
                // Otherwise lets just use a simple div
                wrapper.innerHTML = 'Error getting tube status.';
            }
        } else {
            // Otherwise lets just use a simple div
            wrapper.innerHTML = 'Loading tube status...';
        }

        return wrapper;
    },


    processTubeResults : function(tubeResults, lineRow){
        if (this.config.show_all) {
            tubeResults.appendChild(lineRow);
        } else {
            if (lineStatus.className != 'lineStatus goodStatus' && lineStatus.className  != 'lineStatus closed') {
                tubeResults.appendChild(lineRow);
            }
            else if (lineStatus.className  == 'lineStatus closed') {
                tubeResults.appendChild(lineRow);
                this.serviceClosed++;
                if (this.serviceClosed === this.result.length) { // all lines closed
                    tubeResults = document.createElement('table');
                    tubeResults.className = 'tubeStatus dimmed';

                    allRow = document.createElement('tr');

                    allLines = document.createElement('td');
                    allLines.className = 'lineName dimmed';
                    allLines.innerHTML = 'All Lines';

                    allStatus = document.createElement('td');
                    allStatus.className = 'lineStatus closed';
                    allStatus.innerHTML = 'Service Ended';

                    allRow.appendChild(allLines);
                    allRow.appendChild(allStatus);

                    tubeResults.appendChild(allRow);
                }
            }
            else {
                this.goodService++;
                if (this.goodService === this.result.length) { // all lines good service
                    allRow = document.createElement('tr');

                    allLines = document.createElement('td');
                    allLines.className = 'lineName allLines';
                    allLines.innerHTML = 'All Lines';

                    allStatus = document.createElement('td');
                    allStatus.className = 'lineStatus goodService';
                    allStatus.innerHTML = 'Good Service';

                    allRow.appendChild(allLines);
                    allRow.appendChild(allStatus);

                    tubeResults.appendChild(allRow);
                }

            }
        }


        return tubeResults;
    },

    getLineStatusClass : function(severity) {  // see https://api-argon.tfl.gov.uk/Line/Meta/Severity
        switch (severity) {
            case 18:
            case 10:
                return 'lineStatus goodStatus';
            case 17:
            case 15:
            case 12:
            case 11:
            case 9:
            case 8:
            case 7:
                return 'lineStatus poorStatus';
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
                return 'lineStatus badStatus';
            case 16:
            case 20:
                return 'lineStatus closed';
            default:
                return 'lineStatus';
        }
    },

    socketNotificationReceived : function(notification, payload) {
        // check to see if the response was for us and used the
        // same url
        if (notification === 'GOT-TUBE-STATUS'
            && payload.url === this.url) {
            // we got some data so set the flag, stash the data
            // to display then request the dom update
            this.loaded = true;
            this.result = payload.result;
            this.updateDom(1000);
        }
    }
});
