import CatalogPage from './catalog';
import { hooks } from '@bigcommerce/stencil-utils';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import modalFactory from './global/modal';
import utils from "@bigcommerce/stencil-utils";

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    
    onReady() {
        this.arrangeFocusOnSortBy();
        
        this.addAllToCartHandler();

        this.removeAllFromCartHandler();
        
        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));
        
        this.makeShopByPriceFilterAccessible();
        
        compareProducts(this.context);
        
        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }
        
        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));
        
        this.ariaNotifyNoProducts();
    }

    addProductTimer;
    addProductCounter = 0;
    addProductFormAction = "";
    loadingIcon = document.getElementById("form--add-all-to-cart-loading"); 

    addProduct = () => {
        console.log("Calling the func", this.addProductFormAction);
        $.ajax({
            method: "POST",
            url: this.addProductFormAction
        }).done(response => {
            this.loadingIcon.style.display = "none";
            const cartQty = document.querySelector(".cart-quantity");
            if(cartQty.innerHTML.trim() == "0") {
                cartQty.innerHTML = 1;
            } else {
                cartQty.innerHTML = Number(cartQty.innerHTML) + 1;
            };
            cartQty.classList.add("countPill--positive");

            const userMessage = document.getElementById("form--add-all-to-cart-user-message");

            userMessage.innerHTML = "<center>All items have been added to cart!</center>";

            setTimeout(() => {
                userMessage.style.display = "none";
            }, 3000);
        });
    };
    debounce = (fn, d) => {
    if(this.addProductTimer) {
        clearTimeout(this.addProductTimer);
        this.addProductTimer == undefined;
    }  

    this.addProductTimer = setTimeout(fn, d);
    };
    addAllToCart() {
        console.log( document.querySelectorAll(".form--add-all-to-cart") );
        document.querySelectorAll(".form--add-all-to-cart").forEach(formElement => {
                const formAction = formElement.getAttribute("action");
                this.addProductFormAction = formAction;
                this.loadingIcon.style.display = "block";
                this.debounce(() => {
                    this.addProduct();
                }, 1000);
        });
    };

    removeAllFromCart() {
        
        utils.api.cart.getCart({}, (err, response) => {
            if(!!response) {
                
                const loadingIcon = document.getElementById("form--add-all-to-cart-loading"); 
                loadingIcon.style.display = "block";
                const items = response.lineItems.physicalItems;
                items.map((item) => {
                    this.debounce(() => {
                        utils.api.cart.itemRemove(item.id);
                    }, 500);
                });

          
                loadingIcon.style.display = "none";

                const userMessage = document.getElementById("form--add-all-to-cart-user-message");

                userMessage.innerHTML = "<center>All items have been removed from cart!</center>";
    
    
                const cartQty = document.querySelector(".cart-quantity");
                cartQty.innerHTML = 0;
                cartQty.classList.remove("countPill--positive");
            };
          
        });

        
    };

    // Function that is going to attach event to all "Add all to cart" buttons
    addAllToCartHandler() {
        document.querySelectorAll(".add-all-to-cart").forEach(element => {
            element.addEventListener("click", (event) => {
                this.addAllToCart();
            });
        });
    };

    // Function that is going to attach event to all "Remove all from cart" buttons
    removeAllFromCartHandler() {
        document.querySelectorAll(".remove-all-from-cart").forEach(element => {
            element.addEventListener("click", (event) => {
                this.removeAllFromCart();
            })
        });
    }


    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
