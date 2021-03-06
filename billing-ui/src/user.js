/*
 * Copyright 2016(c) The Ontario Institute for Cancer Research. All rights reserved.
 *
 * This program and the accompanying materials are made available under the terms of the GNU Public
 * License v3.0. You should have received a copy of the GNU General Public License along with this
 * program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
 * WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import {observable, action, autorun} from 'mobx';
import _ from 'lodash';

import {fetchHeaders} from '~/utils';
import {fetchProjects} from '~/services/projects'; 

const user = observable({
  username: '',
  isLoggedIn: false,
  isLoggingIn: false,
  token: '',
  
  login: action(async function (username, password) {
    this.isLoggedIn = false;
    this.isLoggingIn = true;
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: fetchHeaders.get(),
      body: JSON.stringify({
        username,
        password,
      })
    });
    if (response.status === 200) {
      this.isLoggingIn = false;
      this.username = username;
      this.token = response.headers.get('authorization');
      this.roles = await this.setRoles();
      if(!this.roles.report && !this.roles.invoices) {
        this.token = '';
        throw new Error(`
          Please contact your PI to get access to this application. <br/>
          If you are a PI and having trouble accessing this page, Please 
          <a href="https://cancercollaboratory.org/contact-us" target="_blank">Contact Us</a>.`);
      }
      window.sessionStorage.setItem('username', user.username);
      window.sessionStorage.setItem('roles', JSON.stringify(user.roles));
      this.isLoggedIn = true;
    } else if (response.status === 401) {
      throw new Error('Incorrect username or password');
    } else if (response.status === 403) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    } else {
      throw new Error('Login failed');
    }
  }),

  logout: action(async function () {
    console.log('logout');
    user.token = '';
    sessionStorage.clear();
    this.isLoggedIn = false;
    return await Promise.resolve();
  }),

  setRoles: action(async function() {
    const projects = await fetchProjects();
    const report = !!_.find(projects, (project) => _.includes(project.roles, 'billing'));
    const invoices = !!_.find(projects, (project) => _.includes(project.roles, 'invoice'));
    return {
      report,
      invoices
    };
  })
});

user.token = window.sessionStorage.getItem('token');
user.username = window.sessionStorage.getItem('username');
user.roles = JSON.parse(window.sessionStorage.getItem('roles')) || {};
user.isLoggedIn = !!user.token;
autorun(() => window.sessionStorage.setItem('token', user.token));
window.user = user;

export default user;
