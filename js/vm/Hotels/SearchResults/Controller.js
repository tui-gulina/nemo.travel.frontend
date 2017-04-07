define(
	[
		'knockout',
		'js/vm/helpers',
		'js/vm/BaseControllerModel',
		'js/vm/Models/HotelSearchResultsModel',
		'jsCookie',
		'js/vm/Models/SelectRoomsViewModel',
		'js/vm/Models/HotelsBaseModel',
		'js/vm/Models/RecentSearchModel',
		'js/lib/q/v.0.9.2/q.min',
		'js/lib/lodash/v.4.17.4/lodash.min',
		'js/vm/Models/RecentHotelsModel',
		'dotdotdot'
	], 
	function (
		ko,
		helpers,
		BaseControllerModel,
		HotelSearchResultsModel,
		Cookie,
		SelectRoomsViewModel,
		HotelsBaseModel,
		RecentSearchModel,
		Q,
		_,
		RecentHotelsModel
	) {

		function HotelsSearchResultsController(componentParameters) {
			var self = this;

			BaseControllerModel.apply(this, arguments);
			HotelSearchResultsModel.apply(this, arguments);

			var getSearchId = function () {
				return self.$$controller.router.current.getParameterValue('search_id');
			};

			this.roomServicesList = HotelsBaseModel.ROOM_SERVICES;
			this.name = 'HotelsSearchResultsController';
			this.resultsTypeCookie = 'HotelsSearchForm';
			this.mode = HotelsBaseModel.MODE_ID;
			this.hasSearchIdInUrl = !!(getSearchId());
			
			this.searchId = ko.observable(null);
			this.errorCode = ko.observable(false);
			this.$$loading = ko.observable(false);
			this.PFActive = ko.observable(false);
			this.currentCity = ko.observable('');
			this.recentSearches = ko.observableArray(helpers.toArray(RecentSearchModel.getLast()));
			this.bookingCheckInProgress = ko.observable(false);
			this.bookingCheckError = ko.observable(null);
			this.bookingCheckPriceChangeData = ko.observable(null);
			this.bigMapIsVisible = ko.observable(false);

			// big map on full screen
			this.showBigMap = function (hotel) {
				self.bigMapIsVisible(true);
				this.initHotelCardMap(hotel, 'hotelBigMap');
			};

			/** Hotels count displayed to user */
			this.visibleHotelsCount = ko.observable(HotelsBaseModel.DEFAULT_VISIBLE_HOTELS_COUNT);
			this.countOfNights = ko.observable(0);
			this.isListView = ko.observable(true);
			this.oldMarkers = ko.observable([]);
			this.searchInfo = ko.observable({});
			this.resultsLoaded = ko.observable(false);

			this.showGlobalLoading = ko.pureComputed(function () {
				return this.bookingCheckInProgress();
			}, this);

			this.blocks = {
				// key is block id, value is Boolean value (visible or hidden)
				list: ko.observable({}),

				isVisible: ko.computed(function () {
					return function (blockId) {
						return self.blocks.list()[blockId] !== false;
					};
				}, this),

				toggleVisibility: function (blockId) {
					var data = self.blocks.list();

					if (typeof data[blockId] === 'undefined') {
						data[blockId] = true;
					}

					data[blockId] = !data[blockId];

					self.blocks.list(data);
				}
			};

			this.mobileMenu = {
				opened: ko.observable(false),
				openedMain: ko.observable(false),
				openedCurrency: ko.observable(false),
				openedLanguage: ko.observable(false),

				openMain: function () {
					this.openedMain(true);
					this.openedLanguage(false);
					this.openedCurrency(false);
				},

				openCurrency: function () {
					this.openedMain(false);
					this.openedLanguage(false);
					this.openedCurrency(true);
				},

				openLanguage: function () {
					this.openedMain(false);
					this.openedCurrency(false);
					this.openedLanguage(true);
				},

				clickHandler: function () {
					$('body').addClass('nemo-common-mobileControlOpen');
					this.opened(true);
					this.openedMain(true);
				},

				close: function () {
					$('body').removeClass('nemo-common-mobileControlOpen');
					this.opened(false);
					this.openedMain(false);
				},

				changeCurrency: function (currency) {
					self.$$controller.viewModel.agency.onCurrencyChange(currency);
					this.openMain();
				},

				changeLanguage: function (language) {
					self.$$controller.viewModel.agency.changeLanguage(language);
				}
			};

			/**
			 * Switch between map and list view
			 */
			this.toggleView = function () {
				this.isListView(!this.isListView());

				if (!this.isListView()) {
					// Show map with hotels
					this.initMap();
				}
			};

			this.togglePFActive = function () {
				this.PFActive(!this.PFActive());
			};

			this.isShowResultIsEmpty = ko.computed(function () {
				return this.resultsLoaded() && !this.isCardHotelView() && this.isResultEmpty();
			}, this);

			this.searchFormActive = ko.observable(false);
			this.hotels = ko.observableArray([]);
			this.hotelsPool = {};

			this.isCardHotelView = ko.observable(false);
			this.hotelCard = ko.observable(null);

			this.breadCrumbsVariants = ko.computed(function () {
				var baseItems = [
					{
						title: 'hotels-step_search',
						active: true,
						link: '/hotels',
						pageTitle: 'HotelsSearch'
					},
					{
						title: 'hotels-step_results',
						active: !!this.hotelCard(),
						link: '/hotels/results/' + (this.searchId() || ''),
						pageTitle: 'HotelsResults'
					}
				];

				if (this.hotelCard()) {
					baseItems.push({
						title: this.hotelCard().name,
						active: false,
						i18n: this.hotelCard().name,
						pageTitle: this.hotelCard().name
					});
				}
				else {
					baseItems.push({ title: 'hotels-step_chooseHotel', active: false });
				}

				return baseItems;

			}, this);

			this.isFilterNotificationVisible = ko.observable(Cookie.get('filter-notification-visible') !== 'false');

			this.hideFilterNotification = function () {
				Cookie.set('filter-notification-visible', 'false');
				this.isFilterNotificationVisible(false);
			};

			this.selectedRooms = new SelectRoomsViewModel();

			this.showCardHotel = function (hotel) {
				if (!self.bookingCheckInProgress()) {
					self.checkHotelAvailability(self.searchId(), hotel)
						.catch(function (errorMessage) {
							// Show error popup.
							self.bookingCheckError(errorMessage);
	
							return false;
						})
						.then(function (isSuccess) {
							if (isSuccess === true) {
								if (hotel.id in self.hotelsPool) {
									hotel = _.cloneDeep(self.hotelsPool[hotel.id]);
								}
	
								// Display hotel card.
								self.selectedRooms.setHotel(hotel);
	
								self.$$controller.navigate('/hotels/results/' + getSearchId() + '/' + hotel.id, false, hotel.name);
								self.isCardHotelView(true);
								RecentHotelsModel.add(hotel);
	
								hotel.staticDataInfo.currentCity = self.currentCity();
	
								self.hotelCard(hotel);
	
								setTimeout(function () {
									self.initHotelCardMap(hotel, 'cardHotelMap');
								}, 300);
	
								helpers.scroll(0);
							}
						})
						.done(function () {
							self.bookingCheckInProgress(false);
							self.resultsLoaded(true);
						})
				}
			};

			this.makeHotelLink = function (hotel) {
				return '/hotels/results/' + getSearchId() + '/' + hotel.id;
			};

			this.getHotelMainImage = function (hotel, defaultImage) {
				var photos = hotel.staticDataInfo.photos || [],
					mainPhotoId = hotel.staticDataInfo.mainPhotoId,
					baseUrl = this.$$controller.options.controllerSourceURL,
					url = 'url(' + (photos[mainPhotoId] ? photos[mainPhotoId] : baseUrl + '/img/no_hotel.svg') + ')';

				if (defaultImage === 1) {
					url += ', url(' + baseUrl + '/img/no_hotel.svg)';
				}
				else if (defaultImage === 2) {
					url += ', url(' + baseUrl + '/img/hotel_thumb.png)';
				}

				return url;
			};

			this.processInitParams();
		}

		// Extending from dictionaryModel
		helpers.extendModel(HotelsSearchResultsController, [BaseControllerModel, HotelSearchResultsModel]);

		HotelsSearchResultsController.prototype.bookHotel = function (url, rooms) {
			this.bookingCheckInProgress(true);
			
			var roomsInfo = rooms.map(function (room) {
				return room.id;
			});
			
			if (this.$$controller.options.createOrderLinkPrefixHotels) {
				var prefix = this.$$controller.options.createOrderLinkPrefixHotels,
					urlParts = url.split('?'),
					getParams = urlParts.splice(1);
				
				url = prefix + '?' + getParams;
			}
			
			document.location.href = url + '&room_ids=' + roomsInfo.join(',');
		};

		/**
		 * @param {number} searchId
		 * @param {object} hotel
		 */
		HotelsSearchResultsController.prototype.checkHotelAvailability = function (searchId, hotel) {
			this.bookingCheckError(null);
			this.bookingCheckPriceChangeData(null);
			
			if (!this.bookingCheckInProgress()) {
				this.bookingCheckInProgress(true);

				var deferred = Q.defer();

				if (searchId && hotel.id) {
					var message = {
						wrongResponse: this.$$controller.i18n('HotelsSearchResults', 'bookingCheck__error__error_wrongResponse'),
						serverError: this.$$controller.i18n('HotelsSearchResults', 'bookingCheck__error__error_serverError'),
						hotelUnavailable: this.$$controller.i18n('HotelsSearchResults', 'bookingCheck__error__error_unavailable')
					};

					this.$$controller.loadData(
						'/hotels/search/availability/' + searchId + '/' + hotel.id,
						{},
						function (data, request) {
							try {
								data = JSON.parse(data);
							}
							catch (e) {
								deferred.reject(message.wrongResponse);
								return;
							}

							if (data.system.error && data.system.error.message) {
								deferred.reject(message.hotelUnavailable);
							}
							else {
								try {
									this.processSearchResults(data);
								}
								catch (e) {
									console.warn(e);
									deferred.reject(message.hotelUnavailable);
								}
								
								deferred.resolve(true);
							}
						}.bind(this),
						function (request) {
							deferred.reject(message.wrongResponse);
						}
					);
				}

				return deferred.promise;
			}
		};

		HotelsSearchResultsController.prototype.$$KOBindings = ['common', 'HotelsResults'];

		HotelsSearchResultsController.prototype.$$usedModels = [
			'Common/Date',
			'Common/Duration',
			'Common/Money',
			'Common/PostFilter/Abstract',
			'Hotels/Common/Geo'
		];

		HotelsSearchResultsController.prototype.$$i18nSegments = ['HotelsSearchForm', 'HotelsSearchResults', 'currencyNames', 'Hotels'];

		HotelsSearchResultsController.prototype.pageTitle = 'HotelsResults';

		return HotelsSearchResultsController;
	}
);
