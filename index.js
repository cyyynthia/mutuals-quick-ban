/*
 * Copyright (c) 2020 Bowser65
 * Licensed under the Open Software License version 3.0
 */

const { Plugin } = require('powercord/entities');
const { React, getModule, contextMenu, getModuleByDisplayName, constants: { Permissions }, i18n: { Messages } } = require('powercord/webpack');
const { ContextMenu, Icons: { Overflow } } = require('powercord/components');
const { inject, uninject } = require('powercord/injector');
const { open: openModal, close: closeModal } = require('powercord/modal');
const { findInReactTree, getOwnerInstance } = require('powercord/util');

module.exports = class MutualsQuickBan extends Plugin {
  async startPlugin () {
    this.loadStylesheet('style.css');
    const MutualGuilds = await this._fetchMutualsModule();
    const _this = this;
    inject('mutuals-quick-ban', MutualGuilds.prototype, 'render', function (_, res) {
      const instance = getOwnerInstance(document.querySelector('[role="dialog"]'));
      const obj = findInReactTree(instance, n => n.user);
      if (!obj) {
        setTimeout(() => this.forceUpdate(), 10);
        return res;
      }
      res.props.children.forEach(c => c.type = _this._render.bind(_this, c.type, obj.user));
      return res;
    });
  }

  pluginWillUnload () {
    uninject('mutuals-quick-ban');
  }

  _render (ogType, user, props) {
    const res = ogType(props);
    const permsModule = getModule([ 'can', 'getState' ], false);
    const canKick = permsModule.can(Permissions.KICK_MEMBERS, props.guild);
    const canBan = permsModule.can(Permissions.BAN_MEMBERS, props.guild);
    if (canKick || canBan) {
      res.props.children.push(
        React.createElement(Overflow, {
          className: 'mutuals-quick-ban-btn',
          onClick: e => e.stopPropagation() | this.openContextMenu(e, canKick, canBan, props.guild.id, user)
        })
      );
    }
    return res;
  }

  openContextMenu (e, canKick, canBan, guildId, user) {
    contextMenu.openContextMenu(e, () =>
      React.createElement(ContextMenu, {
        width: '50px',
        itemGroups: [ [
          canKick && {
            color: 'colorDanger',
            type: 'button',
            name: Messages.KICK_USER.format({ user: user.username }),
            onClick: () => this.openDialog(false, guildId, user)
          },
          canBan && {
            color: 'colorDanger',
            type: 'button',
            name: Messages.BAN_USER.format({ user: user.username }),
            onClick: () => this.openDialog(true, guildId, user)
          }
        ].filter(Boolean) ]
      })
    );
  }

  openDialog (isBan, guildId, user) {
    const Component = isBan
      ? getModuleByDisplayName('BanConfirm', false)
      : getModuleByDisplayName('KickConfirm', false);
    openModal(() => React.createElement(Component, {
      onClose: closeModal,
      guildId,
      user
    }));
  }

  async _fetchMutualsModule () {
    // BEAUTIFUL, ABSOLUTELY BEAUTIFUL I LOVE INJECTING INTO DISCORD.
    const UserProfile = await getModuleByDisplayName('UserProfile');
    // noinspection JSPotentiallyInvalidConstructorUsage
    const setp1 = React.createElement(UserProfile)
      .type.prototype.render()
      .type.prototype.render.call({ memoizedGetStateFromStores: () => ({}) })
      .type.render()
      .type.prototype.render.call({ props: {} }).type;
    // noinspection JSPotentiallyInvalidConstructorUsage
    return setp1.prototype.render.call({
      ...setp1.prototype,
      props: {
        section: 'MUTUAL_GUILDS',
        user: {
          getAvatarURL: () => void 0,
          hasFlag: () => void 0
        }
      },
      state: {}
    }).props.children.props.children[1].props.children.type;
  }
};
