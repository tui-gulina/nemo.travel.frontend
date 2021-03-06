'use strict';
define(
	['knockout', 'js/vm/helpers', 'js/vm/BaseStaticModel'],
	function (ko, helpers, BaseModel) {
		function CompareTable (initialData) {
			this.controller = initialData.controller;

			var tempFlightGroups = initialData.groups,
				tmpct = {},
				tmpctDirect = {},
				tmpctTransfer = {},
				tempGroupsArrDirect =[],
				tempGroupsArrTransfer =[],
				tempFlightsLength = 0,
				tmpLongestTransfer = 0,
				tmpLongestDirect = 0;


			for (var i = 0; i < tempFlightGroups.length; i++) {
				if (tempFlightGroups[i].isDirectGroup == false && tempFlightGroups[i].filteredOut() == false){
					if (typeof tmpctTransfer[tempFlightGroups[i].getFirstSegmentMarketingCompany().IATA] == 'undefined') {
						tmpctTransfer[tempFlightGroups[i].getFirstSegmentMarketingCompany().IATA] = {
							company: tempFlightGroups[i].getFirstSegmentMarketingCompany(),
							groups: []
						};
					}
					tmpctTransfer[tempFlightGroups[i].getFirstSegmentMarketingCompany().IATA].groups.push(tempFlightGroups[i]);
				}else if (tempFlightGroups[i].isDirectGroup == true && tempFlightGroups[i].filteredOut() == false) {
					if (typeof tmpctDirect[tempFlightGroups[i].getFirstSegmentMarketingCompany().IATA] == 'undefined') {
						tmpctDirect[tempFlightGroups[i].getFirstSegmentMarketingCompany().IATA] = {
							company: tempFlightGroups[i].getFirstSegmentMarketingCompany(),
							groups: []
						};
					}
					tmpctDirect[tempFlightGroups[i].getFirstSegmentMarketingCompany().IATA].groups.push(tempFlightGroups[i]);
				}
			}

			for(var i in tmpctTransfer) {
				if (tmpctTransfer.hasOwnProperty(i)){
					if (!isNaN(parseFloat(i)) && isFinite(i)){
						tempGroupsArrTransfer[i] = tmpctTransfer[i];
					}else{
						tempGroupsArrTransfer.push(tmpctTransfer[i]);
					}
				}
			}

			for(var i in tmpctDirect) {
				if (tmpctDirect.hasOwnProperty(i)){
					if (!isNaN(parseFloat(i)) && isFinite(i)){
						tempGroupsArrDirect[i] = tmpctDirect[i];
					}else{
						tempGroupsArrDirect.push(tmpctDirect[i]);
					}
				}
			}


			for (var i = 0; i < tempGroupsArrTransfer.length; i++){
				tempGroupsArrTransfer[i].groupsFilteredOut = ko.computed(function() {
					for (var j = 0; j < this.groups.length; j++) {
						if (this.groups[j].filteredOut() == false) {
							return false;
						}
						else {
							return true;
						}
					}
				}, tempGroupsArrTransfer[i]);
			}

			for (var i = 0; i < tempGroupsArrDirect.length; i++){
				tempGroupsArrDirect[i].groupsFilteredOut = ko.computed(function() {
					for (var j = 0; j < this.groups.length; j++) {
						if (this.groups[j].filteredOut() == false) {
							return false;
						}
						else {
							return true;
						}
					}
				}, tempGroupsArrDirect[i]);
			}



			if(tempGroupsArrTransfer.length>0){
				tmpLongestTransfer = tempGroupsArrTransfer.sort(function(a, b) {
					return b.groups.length - a.groups.length;
				})[0].groups.length;
			}else{
				tmpLongestTransfer = 0;
			}

			if(tempGroupsArrDirect.length>0){
				tmpLongestDirect = tempGroupsArrDirect.sort(function(a, b) {
					return b.groups.length - a.groups.length;
				})[0].groups.length;
			}else{
				tmpLongestDirect = 0;
			}

			tempGroupsArrTransfer.sort(function(a,b){
				return a.groups[0].getTotalPrice().amount() - b.groups[0].getTotalPrice().amount()
			});
			tempGroupsArrDirect.sort(function(a,b){
				return a.groups[0].getTotalPrice().amount() - b.groups[0].getTotalPrice().amount()
			});


			if(tmpLongestDirect >= tmpLongestTransfer){
				this.controller.compareTableLongestColumn(new Array(tmpLongestDirect))
			}else{
				this.controller.compareTableLongestColumn(new Array(tmpLongestTransfer))
			}

			if(initialData.direct == true){
				this.groups = tempGroupsArrDirect;
			}else if (initialData.direct == false){
				this.groups = tempGroupsArrTransfer;
			}

			for(var i=0;i<this.groups.length;i++){
				tempFlightsLength += parseInt(this.groups[i].groups.length);
			}

			this.flightsLength = tempFlightsLength;
			//pagination
			this.paginationStep = ko.observable(3);
			this.paginationShownPages = ko.observable(0);

			this.allGroupsVisible = ko.observable(true);

			this.indexHelper = ko.computed(function(){ //TODO refactor flag counting for ShowMore
				return [this.paginationShownPages() + this.paginationStep()-3,this.paginationShownPages() + this.paginationStep()-2, this.paginationShownPages() + this.paginationStep()-1]
			}, this);

			this.paginationHasNext = ko.computed(function(){
				if (this.paginationShownPages() + this.paginationStep() >= this.groups.length){
					return false;
				}else{
					return true;
				}
			}, this);

			this.paginationHasPrev = ko.computed(function(){
				if (this.paginationShownPages() <= 0){
					return false;
				}else{
					return true;
				}
			}, this);

			//show more block
			this.flagToShowMore = ko.computed(function(){
				for (var i in this.indexHelper()){
					if(typeof this.groups[this.indexHelper()[i]] != 'undefined' && this.groups[this.indexHelper()[i]].groups.length >= 3){
						return true;
					}
				}
			},this);

			this.isDisplayable = ko.computed(function () {
				var count = 0;

				for (var i = 0; i < this.groups.length; i++ ) {
					if (!this.groups[i].groupsFilteredOut()) {
						count++;
					}
				}

				return count >= this.columnThreshold;
			}, this);


			BaseModel.apply(this, arguments);

			if (this.transfersTypes.indexOf(this.transfersType) < 0) {
				this.transfersType = this.transfersTypes[0];
			}
		}

		// Extending from dictionaryModel
		helpers.extendModel(CompareTable, [BaseModel]);

		CompareTable.prototype.columnThreshold = 3;
		CompareTable.prototype.transfersTypes = ['sum', 'min', 'max'];

		CompareTable.prototype.paginationNext = function(){
			if(this.paginationHasNext()){
				var current = this.paginationShownPages();
				this.paginationShownPages(current + this.paginationStep());
			}
		};

		CompareTable.prototype.paginationPrev = function(){
			if(this.paginationHasPrev()){
				var current = this.paginationShownPages();
				this.paginationShownPages(current - this.paginationStep());
			}
		};

		CompareTable.prototype.toggleVisibleGroups = function(){
			if (this.controller.compareTableLongestColumn().length > 7){
				if(this.controller.compareTablesOpenGroups() == 2 ){
					this.controller.compareTablesOpenGroups(7);
				}else if (this.controller.compareTablesOpenGroups() == 7){
					this.controller.compareTablesOpenGroups(Infinity);
				}
				else{
					this.controller.compareTablesOpenGroups(2);
				}
			}else{
				if(this.controller.compareTablesOpenGroups() == 2 ){
					this.controller.compareTablesOpenGroups(Infinity);
				}
				else{
					this.controller.compareTablesOpenGroups(2);
				}
			}
		};

		CompareTable.prototype.getTransfersCountForFlight = function (flight) {
			var ret = 0,
				transfers = flight.transfers.map(function (i) {return i.length});

			switch (this.transfersType) {
				case 'sum':
					transfers.map(function (i) {ret += i;});
					break;
				case 'max':
					ret = Math.max.apply(Math, transfers);
					break;
				case 'min':
					transfers = transfers
						.reduce(function(p, c) {
								if (p.indexOf(c) < 0) p.push(c);
								return p;
							}, [])
						.sort(function (a, b) {return a - b});

					if (transfers[0] == 0 && transfers.length > 1) {
						ret = transfers[1];
					}
					else {
						ret = transfers[0];
					}

					break;
			}

			return ret;
		};

		CompareTable.prototype.getTransfersCountForFlightFormatted = function (flight) {
			var ret = this.getTransfersCountForFlight(flight);

			return ret + (flight.transfersCount > ret ? '+' : '');
		};

		return CompareTable;
	});