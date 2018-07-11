/*
 * skype-for-business-server-connector
 *
 * Copyright 2018 Orange
 * <tuan.dunghoang@orange.com>
 *
 * This library is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by the
 * Free Software Foundation; either version 2.1 of the License, or (at your
 * option) any later version.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License
 * for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library; if not, write to the Free Software Foundation,
 * Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 *
 */

module.exports = {
  // LYNC
  domain: 'https://foo.bar',
  // FDS
  fdsNamespace: 'https://io.datasync.orange.com/base/foo-bar',
  fdsAppResourcePath: '/foo.json',
  // IM Lync acc
  lyncUsername: 'foo', 
  lyncPassword: 'bar', 
  lyncUserAgent: 'foobar',
  lyncEndpointId: 'foobar',
  lyncCulture: 'en-US', // might change, depending on future needs
  // Smartly
  smartlyBotSkillId: 'foobar',
  smartlyBotLang: 'foobar',
  smartlyAccessToken:
    'foobar'
};
