'use strict';
define(
	['knockout', 'js/vm/helpers', 'js/vm/BaseControllerModel'],
	function (ko, helpers, BaseControllerModel) {
		function CommonBreadCrumbsController (componentParameters) {
			BaseControllerModel.apply(this, arguments);

			this.elements = [];
			this.additionalComponent = componentParameters.includeComponent;

			var componentName = componentParameters.component.constructor.name;

			if (componentName.indexOf('Flights') === 0) {
				this.elements = [
					{
						title: 'flights-step_search',
						active: true,
						link: '/',
						router: true
					},
					{
						title: 'flights-step_results',
						active: false,
						link: '/',
						router: true
					},
					{
						title: 'flights-step_checkout',
						active: false,
						link: '/order/',
						router: true
					}
				];

				switch (componentName) {
					case 'FlightsSearchResultsController':
						this.elements[0].link += componentParameters.component.id;
						break;
				}
			}
		}

		// Extending from dictionaryModel
		helpers.extendModel(CommonBreadCrumbsController, [BaseControllerModel]);

		CommonBreadCrumbsController.prototype.buildModels = function () {};

		CommonBreadCrumbsController.prototype.dataURL = function () {
			return null;
		};

		CommonBreadCrumbsController.prototype.$$i18nSegments = ['CommonBreadCrumbs'];

		return CommonBreadCrumbsController;
	}
);