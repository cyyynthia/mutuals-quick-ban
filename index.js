/*
 * Copyright (c) 2021 Cynthia K. Rey, All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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
    const MutualGuilds = await getModule((m) => m.default?.displayName == 'MutualGuilds')
    inject('mutuals-quick-ban', MutualGuilds, 'default', (_, res) => {
      const instance = getOwnerInstance(document.querySelector('[role="dialog"]'));
      const obj = findInReactTree(instance, n => n.user);
      if (!obj) {
        console.log('!!');
        // setTimeout(() => this.forceUpdate(), 10);
        return res;
      }

      res.props.children.forEach(c => c.type = this._render.bind(this, c.type, obj.user));
      return res;
    });

    MutualGuilds.default.displayName = 'MutualGuilds';
  }

  pluginWillUnload () {
    uninject('mutuals-quick-ban');
  }

  _render (ogType, user, props) {
    const res = ogType(props);
    const permsModule = getModule([ 'can', 'isRoleHigher' ], false);
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
      transitionState: 1,
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
