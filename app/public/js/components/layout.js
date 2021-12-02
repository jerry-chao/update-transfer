let globalPassword = "";

export default {
  name: 'Layout',
  components: {
    "vtoast": window.vtoast,
  },

  props: {
    // app 标题
    appTitle: String,
    // 菜单选项
    menuItems: Array,
    // 选中了哪个 index，用于传回给父组件使用
    selectedItemWrapper: Object,
    // APP 目录的链接
    appDirectoryLink: String,
    // 用户信息，用于传回给父组件使用
    userInfoWrapper: Object,
  },

  data: () => ({
    // 是否与登录
    layoutLoading: true,

    selectedItem: 0,
    selectItemTitle: '',
    drawer: null,

    // 用户菜单
    realMenuItems: [],
    profileMenus: [],

    // dialog
    dialogConfirm: false,
    dialogResetPassword: false,

    // 修改密码
    valid: true,
    oldPassword: '',
    newPassword: '',
    newPassword2: '',

    // rule
    passwordRules: [
      v => !!v || 'This is required',
      v => (v && v.length <= 32) || 'Name must be less than 32 characters',
      v => (v && v.length >= 6) || 'Name must be more than 6 characters',
    ],
    passwordConfirmRules: [
      (v) => v === globalPassword || "Password must match",
    ],
  }),

  watch: {
    // 从父组件传下来的
    selectedItemWrapper: {
      immediate: true, // 第一次赋值就触发
      handler: function (newVal) {
        // console.log(newVal)
        this.selectedItem = newVal.selectedItem
      }
    },
    dialogConfirm(val) {
      val || this.closeConfirm()
    },
    dialogResetPassword(val) {
      val || this.closeResetPasswordDialog()
    },
    // 保存密码到全局密码中，辅助校验
    newPassword(val) {
      globalPassword = val;
    },
  },

  computed: {
    isMobile() {
      return this.$vuetify.breakpoint.xsOnly;
    }
  },

  async created() {
    await this.getLoginUserInfo();
    await this.removeNotPermissionMenuItem();
    await this.locateCurrentMenuItem();
  },

  mounted() {
    window.vtoast = this.$refs.vtoast;
  },

  methods: {
    // 跳转链接
    jump(url, queryParams) {
      if (queryParams) {
        const queryStrings = Object.keys(queryParams)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(queryParams[k]))
            .join('&');
        window.location.href = url + '?' + queryStrings;
      } else {
        window.location.href = url;
      }
    },
    // 定位当前页面在属于哪个菜单
    locateCurrentMenuItem() {
      // 如果当前页面的 queryParam 中有 fromIndex，则使用它
      let urlParams = new URLSearchParams(location.search);
      if (urlParams.get('fromIndex')) {
        // 设置标题、菜单选中
        this.applyMenuIndex(parseInt(urlParams.get('fromIndex')));
        return
      }
      // 遍历菜单 path 进行匹配
      for (let i = 0; i < this.realMenuItems.length; i++) {
        if (this.realMenuItems[i] && this.realMenuItems[i].path && location.pathname === this.realMenuItems[i].path) {
          this.applyMenuIndex(i + 1);
          return
        }
      }
    },
    // 设置当前所在菜单项
    applyMenuIndex(index) {
      // 设置标题、菜单选中
      this.selectedItem = index;
      this.selectedItemWrapper.selectedItem = index;
      this.selectItemTitle = this.realMenuItems[index - 1].title;
      document.title = this.appTitle + (this.selectItemTitle ? " - " + this.selectItemTitle : "")
    },
    // 删除没权限的菜单项
    removeNotPermissionMenuItem() {
      this.realMenuItems = this.menuItems.filter(item => this.checkPagePermission(item.path, false));
    },
    // 获取用户信息
    async getLoginUserInfo() {
      const userInfo = await protocol.user_userInfo({});
      this.userInfoWrapper.userInfo = userInfo;
      // 判断 page 权限
      const checkResult = this.checkPagePermission()
      if (checkResult) {
        this.layoutLoading = false;
      }
      // token expireAt check, 若token 已经使用一半的时间了 触发 refresh token
      const {expireAt, issuedAt} = userInfo;
      const maxSecond = expireAt - issuedAt;
      const hasUsedSecond = dayjs().unix() - issuedAt;
      if (hasUsedSecond > maxSecond / 2) {
        const refreshToken = localStorage.getItem(`${window.appId}_refreshToken`);
        const data = await protocol.login_refreshToken({refreshToken});
        if (data.authToken) {
          localStorage.setItem(`${window.appId}_authToken`, data.authToken);
        }
      }
    },
    // 登出
    async logout() {
      const appLoginPage = this.appLoginPage;
      protocol
          .login_logout({})
          .then(() => {
            vtoast.success('注销成功');
            localStorage.removeItem('authToken');
            localStorage.removeItem(`${window.appId}_refreshToken`);
            setTimeout(() => {
              location.href = `/${window.appId}/login`;
            }, 700);
          })
          .catch(err => {
            vtoast.fail(err.errorReason);
            localStorage.removeItem('authToken');
            localStorage.removeItem(`${window.appId}_refreshToken`);
            setTimeout(() => {
              location.href = `/${window.appId}/login`;
            }, 700);
          });
    },
    // 弹出对话框
    openResetPasswordDialog() {
      this.dialogResetPassword = true
    },
    // 点击确认
    async yesResetPassword() {
      await protocol.user_resetPassword({oldPassword: this.oldPassword, newPassword: this.newPassword});
      this.$refs.vtoast.success('修改密码成功！');
      this.closeResetPasswordDialog()
    },
    // 关闭删除对话框
    closeResetPasswordDialog() {
      this.dialogResetPassword = false
    },

    // 弹出对话框
    openConfirm() {
      this.dialogConfirm = true
    },
    // 点击确认
    async yesConfirm() {
      await protocol.layout_syncDataToDataRepository({});
      this.$refs.vtoast.success('同步成功！');
      this.closeConfirm()
    },
    // 关闭删除对话框
    closeConfirm() {
      this.dialogConfirm = false
    },
    // 判断页面权限
    checkPagePermission(path = null, needJump = true) {
      const { allowPageList } = this.userInfoWrapper.userInfo;
      if (allowPageList && allowPageList.includes('*')) {
        return true;
      }
      if (!path) {
        path = window.location.pathname;
      }
      path = path.replace(`/${window.appId}/`, '');
      if (allowPageList && allowPageList.includes(path)) {
        return true;
      }

      if (needJump) {
        window.location.href = '/404';
      }
      return false;
    },
  },

  template: `
  <v-app id="inspire" mobile-breakpoint="sm">
    <div v-if="layoutLoading" class="text-center mt-10">
      <v-progress-circular
        :size="70"
        :width="7"
        color="purple"
        indeterminate
      ></v-progress-circular>
    </div>
    <template v-else>
      <v-navigation-drawer
  v-model="drawer"
  app
  clipped
  v-if="isMobile"
>
  <v-list>
    <v-list-item-group
      v-model="selectedItem"
      color="primary"
  >
      <v-list-item
        @click="jump(appDirectoryLink)"
        class="pa-2 pb-2"
      >
        <v-list-item-content>
          <v-list-item-title>
            回到目录
            <v-icon>mdi-keyboard-return</v-icon>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item> 
      <v-list-item
        v-for="item in realMenuItems"
        class="pa-2 pb-2"
        :key="item.title"
        @click="jump(item.path, item.query)"
      >
        <v-list-item-content>
          <v-list-item-title>
            {{ item.title }}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item> 
    </v-list-item-group>
  </v-list>
</v-navigation-drawer>


      <v-app-bar
          app
          clipped-left
          flat
      >
         <v-app-bar-nav-icon @click.stop="drawer = !drawer" v-if="isMobile"></v-app-bar-nav-icon>

        <v-toolbar-title class="mr-12 align-center" style="min-width: 10%">
          <span class="title">{{ appTitle }}</span>
        </v-toolbar-title>
        
        <v-tabs
          v-model="selectedItem"
          v-if="!isMobile"
          show-arrows
          style="max-width: 70%"
        >
          <v-tabs-slider color="primary"></v-tabs-slider>

          <v-tab
            @click="jump(appDirectoryLink)"
          >
            回到目录
            <v-icon>mdi-keyboard-return</v-icon>
          </v-tab>
          <v-tab
            v-for="item in realMenuItems"
            :key="item.title"
            @click="jump(item.path, item.query)"
          >
            {{ item.title }}
          </v-tab>
        </v-tabs>
        <v-spacer/>
        
        <div>
          <v-menu offset-y>
            <template v-slot:activator="{ on }">
               <v-btn style="color: rgba(0,0,0,.54)!important" disabled text class="ml-1 text-none" v-on="on">
                {{userInfoWrapper && userInfoWrapper.userInfo && userInfoWrapper.userInfo.displayName}}
                <br>
                {{userInfoWrapper && userInfoWrapper.userInfo && userInfoWrapper.userInfo.username}}
              </v-btn>
              <v-btn icon small class="ml-1" v-on="on">
                 <v-icon>mdi-account-circle</v-icon>
              </v-btn>
            </template>

            <v-list nav dense>

              <v-list-item
                  v-for="(item, index) in profileMenus"
                  :key="index"
                  :href="item.path"
                  class="mt-2"
              >
                <v-list-item-icon>
                  <v-icon>{{ item.icon }}</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>{{ item.title }}</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              
              <v-list-item @click="openResetPasswordDialog">
                <v-list-item-icon class="mr-2">
                  <v-icon>mdi-circle-edit-outline</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>重置密码</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              
              <v-list-item @click="logout">
                <v-list-item-icon class="mr-2">
                  <v-icon>mdi-logout</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>登出</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </v-app-bar>

      <v-main>
        <slot></slot>
      </v-main>
      
      <!-- 修改密码对话框 -->
      <v-dialog v-model="dialogResetPassword" max-width="800px">
        <v-card>
          <v-card-title class="text-h5">修改密码</v-card-title>
          
          <v-card-text>
            <v-form
                v-model="valid"
                ref="form"
                lazy-validation>
              <v-text-field
                  v-model="oldPassword"
                  label="旧密码"
                  type="password"
                  :rules="passwordRules"
                  required
              ></v-text-field>
              <v-text-field
                  v-model="newPassword"
                  label="新密码"
                  type="password"
                  :rules="passwordRules"
                  required
              ></v-text-field>
              <v-text-field
                  v-model="newPassword2"
                  label="再次输入新密码"
                  type="password"
                  :rules="passwordConfirmRules"
                  required
              ></v-text-field>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" text @click="closeResetPasswordDialog">取消</v-btn>
            <v-btn color="blue darken-1" text @click="yesResetPassword">确定</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
    <!-- toast -->
    <vtoast ref="vtoast"/>
  </v-app>
`
}
