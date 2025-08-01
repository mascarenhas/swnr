import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { getGameSettings } from '../helpers/register-settings.mjs';
import { checkboxFieldWidget, groupFieldWidget } from '../helpers/handlebar.mjs';


const { api, sheets } = foundry.applications;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheetV2}
 */
export class SWNItemSheet extends api.HandlebarsApplicationMixin(
  sheets.ItemSheetV2
) {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['swnr', 'item'],
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewEffect,
      createDoc: this._createEffect,
      deleteDoc: this._deleteEffect,
      toggleEffect: this._toggleEffect,
    },
    form: {
      submitOnChange: true,
    },
    // Custom property that's merged into `this.options`
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: null }],
    window: {
      resizable: true
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: 'systems/swnr/templates/item/header.hbs',
    },
    headerGear: {
      template: 'systems/swnr/templates/item/header-gear.hbs',
    },
    headerProgram: {
      template: 'systems/swnr/templates/item/header-program.hbs',
    },
    headerCyberware: {
      template: 'systems/swnr/templates/item/header-cyberware.hbs',
    },
    headerSkill: {
      template: 'systems/swnr/templates/item/header-skill.hbs',
    },
    headerFeature: {
      template: 'systems/swnr/templates/item/header-feature.hbs',
    },
    headerAsset: {
      template: 'systems/swnr/templates/item/header-asset.hbs',
    },
    headerShip: {
      template: 'systems/swnr/templates/item/header-ship.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    description: {
      template: 'systems/swnr/templates/item/description.hbs',
    },
    attributesFeature: {
      template:
        'systems/swnr/templates/item/attribute-parts/feature.hbs',
    },
    attributesItem: {
      template: 'systems/swnr/templates/item/attribute-parts/item.hbs',
    },
    attributesProgram: {
      template: 'systems/swnr/templates/item/attribute-parts/program.hbs',
    },
    attributesPower: {
      template: 'systems/swnr/templates/item/attribute-parts/power.hbs',
    },
    attributesWeapons: {
      template: 'systems/swnr/templates/item/attribute-parts/weapon.hbs',
    },
    attributesCyberware: {
      template: 'systems/swnr/templates/item/attribute-parts/cyberware.hbs'
    },
    effects: {
      template: 'systems/swnr/templates/item/effects.hbs',
    },
    attributesSkill: {
      template: 'systems/swnr/templates/item/attribute-parts/skill.hbs',
    },
    attributesAsset: {
      template: 'systems/swnr/templates/item/attribute-parts/asset.hbs',
    },
    attributesAssetAtkDef: {
      template: 'systems/swnr/templates/item/attribute-parts/assetAtkDef.hbs',
    },
    attributesArmor: {
      template: 'systems/swnr/templates/item/attribute-parts/armor.hbs',
    },
    attributesShipWeapon: {
      template: 'systems/swnr/templates/item/attribute-parts/ship-weapon.hbs'
    },
    attributesShipFitting: {
      template: 'systems/swnr/templates/item/attribute-parts/ship-fitting.hbs'
    },
    attributesShipDefense: {
      template: 'systems/swnr/templates/item/attribute-parts/ship-defense.hbs'
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = [];
    switch (this.document.type) {
      case 'item':
      case 'weapon':
      case 'armor':
        options.parts.push('headerGear');
        break;
      case 'program':
        options.parts.push('headerProgram');
        break;
      case 'cyberware':
        options.parts.push('headerCyberware');
        break;
      case 'skill':
        options.parts.push('headerSkill');
        break;
      case 'feature':
        options.parts.push('headerFeature');
        break;
      case 'asset':
        options.parts.push('headerAsset');
        break;
      case 'shipFitting':
      case 'shipDefense':
      case 'shipWeapon':        
        options.parts.push('headerShip');
        break;
      default:
        options.parts.push('header');
        break;
    }
    options.parts.push('tabs');
    //wsai adding to allow setting default tab
    options.defaultTab= 'description';
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'feature':
        options.parts.push('effects');
        break;
      case 'item':
        options.parts.push('attributesItem');
        options.defaultTab = 'attributes';
        break;
      case 'power':
        options.parts.push('attributesPower');
        options.defaultTab = 'attributes';
        break;
      case 'weapon':
        options.parts.push('attributesWeapons');
        options.defaultTab = 'weapon';
        break;
      case 'armor':
        options.parts.push('attributesArmor');
        options.defaultTab = 'armor';
        break;
      case 'cyberware':
        options.parts.push('attributesCyberware');
        options.defaultTab = 'attributes';
        break;
      case 'program':
        options.parts.push('attributesProgram');
        options.defaultTab = 'program';
        break;
      case 'asset':
        options.parts.push('attributesAsset');
        options.parts.push('attributesAssetAtkDef');
        options.defaultTab = 'asset';
        break;
      case 'shipWeapon':
        options.parts.push('attributesShipWeapon');
        options.defaultTab = 'attributes';
        break;
      case 'shipFitting':
        options.parts.push('attributesShipFitting');
        options.defaultTab = 'attributes';
        break;
      case 'shipDefense':
        options.parts.push('attributesShipDefense');
        options.defaultTab = 'attributes';
        break;
      case 'skill':
        break;
    }
    options.parts.push('description');
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {
      // Validates both permissions and compendium status
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      // Add the item document.
      item: this.item,
      // Adding system and flags for easier access
      system: this.item.system,
      flags: this.item.flags,
      // Adding a pointer to CONFIG.SWN
      config: CONFIG.SWN,
      // You can factor out context construction to helper functions
      tabs: this._getTabs(options.parts, options.defaultTab),
      // Necessary for formInput and formFields helpers
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      gameSettings: getGameSettings(),
      groupWidget: groupFieldWidget.bind(this),
      checkWidget: checkboxFieldWidget.bind(this),
      related: this._getRelatedItems(),
    };
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'attributesFeature':
      case 'attributesItem':
      case 'attributesArmor':
      case 'attributesProgram':
      case 'attributesPower':
      case 'attributesSpell':
      case 'attributesWeapons':
      case 'attributesCyberware':
      case 'attributesAsset':
      case 'attributesAssetAtkDef':
      case 'attributesShipDefense':
      case 'attributesShipFitting':
      case 'attributesShipWeapon':
        // Necessary for preserving active tab on re-render
        context.tab = context.tabs[partId];
        break;
      case 'description':
        context.tab = context.tabs[partId];
        // Enrich description info for display
        // Enrichment turns text like `[[/r 1d20]]` into buttons
        context.enrichedDescription = await TextEditor.enrichHTML(
          this.item.system.description,
          {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Data to fill in for inline rolls
            rollData: this.item.getRollData(),
            // Relative UUID resolution
            relativeTo: this.item,
          }
        );
        break;
      case 'effects':
        context.tab = context.tabs[partId];
        // Prepare active effects for easier access
        context.effects = prepareActiveEffectCategories(this.item.effects);
        break;
    }
    return context;
  }

  /**
   * Generates the data for the generic tab navigation template
   * @param {string[]} parts An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts, defaultTab = 'description') {
    // If you have sub-tabs this is necessary to change
    const tabGroup = 'primary';
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = defaultTab;
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: 'sheet-body',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'SWN.Item.Tabs.',
      };
      switch (partId) {
        case 'header':
        case 'headerGear':
        case 'headerProgram':
        case 'headerCyberware':
        case 'headerSkill':
        case 'headerFeature':
        case 'headerAsset':
        case 'headerShip':
        case 'tabs':
          return tabs;
        case 'description':
          tab.id = 'description';
          tab.label += 'Description';
          break;
        case 'attributesArmor':
          tab.id = 'armor';
          tab.label += 'ArmorDetails';
          break;
        case 'attributesFeature':
        case 'attributesItem':
        case 'attributesSkill':
        case 'attributesCyberware':
        case 'attributesPower':
        case 'attributesShipDefense':
        case 'attributesShipFitting':
        case 'attributesShipWeapon':
          tab.id = 'attributes';
          tab.label += 'Attributes';
          break;
        case 'attributesWeapons':
          tab.id = 'weapon';
          tab.label += 'WeaponDetails';
          break;
        case 'attributesAsset':
          tab.id = 'asset';
          tab.label += 'AssetDetails';
          break;
        case 'attributesAssetAtkDef':
          tab.id = 'assetAtkDef';
          tab.label += 'AssetAtkDef';
          break;
        case 'attributesProgram':
          tab.id = 'program';
          tab.label += 'ProgramDetails';
          break;
        case 'effects':
          tab.id = 'effects';
          tab.label += 'Effects';
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(context, options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));
    // Add a change listener for the location selector


    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
  }

  _getRelatedItems() {
    // Get the related items for the owning parent (if any) for ammo
    const item = this.item;
    let ammo = [];
    const parent = item.parent;
    if (parent && parent.type === 'character' && item.type === 'weapon') {
      //console.log(`Getting related items for ${item.name} with parent ${parent.name}`);
      // Get the related
      const ammoType = item.system.ammo?.type;
      //console.log(`Ammo type for ${item.name} is ${ammoType}`);
      if (ammoType && ammoType !== 'none') {
        ammo = parent.items.filter(
          (i) => i.type === 'item' &&  i.system.uses.consumable !== "none" && i.system.uses.ammo === ammoType
        );
      }
    }
    const related = {
      ammo: ammo,

    };
    return related;
  }

  /**************
   *
   *   ACTIONS
   *
   **************/

  /**
   * Handle changing a Document's image.
   *
   * @this SWNItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new FilePicker({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this SWNItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewEffect(event, target) {
    const effect = this._getEffect(target);
    effect.sheet.render(true);
  }

  /**
   * Handles item deletion
   *
   * @this SWNItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteEffect(event, target) {
    const effect = this._getEffect(target);
    await effect.delete();
  }

  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this SWNItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createEffect(event, target) {
    // Retrieve the configured document class for ActiveEffect
    const aeCls = getDocumentClass('ActiveEffect');
    // Prepare the document creation data by initializing it a default name.
    // As of v12, you can define custom Active Effect subtypes just like Item subtypes if you want
    const effectData = {
      name: aeCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: target.dataset.type,
        parent: this.item,
      }),
    };
    // Loop through the dataset and add it to our effectData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (['action', 'documentClass'].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in power.hbs, with `data-system.power-level`
      // which turns into the dataKey 'system.powerLevel'
      foundry.utils.setProperty(effectData, dataKey, value);
    }

    // Finally, create the embedded document!
    await aeCls.create(effectData, { parent: this.item });
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this SWNItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEffect(target);
    await effect.update({ disabled: !effect.disabled });
  }

  /** Helper Functions */

  /**
   * Fetches the row with the data for the rendered embedded document
   *
   * @param {HTMLElement} target  The element with the action
   * @returns {HTMLLIElement} The document's row
   */
  _getEffect(target) {
    const li = target.closest('.effect');
    return this.item.effects.get(li?.dataset?.effectId);
  }

  /**
   *
   * DragDrop
   *
   */

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ('link' in event.target.dataset) return;

    let dragData = null;

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const item = this.item;
    const allowed = Hooks.call('dropItemSheetData', item, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, data);
      case 'Actor':
        return this._onDropActor(event, data);
      case 'Item':
        return this._onDropItem(event, data);
      case 'Folder':
        return this._onDropFolder(event, data);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass('ActiveEffect');
    const effect = await aeCls.fromDropData(data);
    if (!this.item.isOwner || !effect) return false;

    if (this.item.uuid === effect.parent?.uuid)
      return this._onEffectSort(event, effect);
    return aeCls.create(effect, { parent: this.item });
  }

  /**
   * Sorts an Active Effect based on its surrounding attributes
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  _onEffectSort(event, effect) {
    const effects = this.item.effects;
    const dropTarget = event.target.closest('[data-effect-id]');
    if (!dropTarget) return;
    const target = effects.get(dropTarget.dataset.effectId);

    // Don't sort on yourself
    if (effect.id === target.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (let el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      if (siblingId && siblingId !== effect.id)
        siblings.push(effects.get(el.dataset.effectId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });
    const updateData = sortUpdates.map((u) => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.item.updateEmbeddedDocuments('ActiveEffect', updateData);
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.item.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an item reference or item data onto an Actor Sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    if (!this.item.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.item.isOwner) return [];
  }

  /** The following pieces set up drag handling and are unlikely to need modification  */

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  // This is marked as private because there's no real need
  // for subclasses or external hooks to mess with it directly
  #dragDrop;

  /**
   * Create drag-and-drop workflow handlers for this Application
   * @returns {DragDrop[]}     An array of DragDrop handlers
   * @private
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new DragDrop(d);
    });
  }
}
