{% extends 'pageLayout/layout.vue'%}

<!-- vue template 代码块 -->
{% block vue_template %}
<v-app id="inspire">
<v-main>
  <v-container
      class="fill-height"
      fluid
  >
    <v-row
        align="center"
        justify="center"
    >
      <v-col
          cols="12"
          sm="8"
          md="4"
      >
        <v-card class="elevation-12">
          <v-toolbar
              color="primary"
              dark
              flat
          >
            <v-toolbar-title><$ ctx.app.config.appTitle $> - 登录</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-card-text>
            <v-form>
              <v-text-field
                  id="username"
                  v-model="username"
                  label="账号"
                  name="username"
                  prepend-icon="mdi-account"
                  type="text"
              ></v-text-field>

              <v-text-field
                  id="password"
                  v-model="password"
                  label="密码"
                  name="password"
                  prepend-icon="mdi-lock"
                  type="password"
              ></v-text-field>
            </v-form>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="primary" type="submit" @click="login">登入</v-btn>
            </v-card-actions>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</v-main>
</v-app>

<!-- toast -->
<vtoast ref="vtoast"/>
{% endblock %}


<!-- vue script 代码块 -->
<!-- 注意：本项目的 vue 为每个页面使用一个 vue 实例 -->
{% block vue_body %}

<script type="module">
import VToast from '/<$ ctx.app.config.appId $>/public/js/components/vtoast.js';

new Vue({
  el: '#app',
  template: '#app-template',
  vuetify: new Vuetify(),
  components: {
    "vtoast": VToast,
  },
  data: {
    username: '',
    password: ''
  },

  mounted() {
    window.vtoast = this.$refs.vtoast;
  },

  methods: {
    async login() {
      try {
        const data = await protocol.login_passwordLogin({username: this.username, password: this.password});
        if (data.authToken) {
          localStorage.setItem(`${window.appId}_authToken`, data.authToken);
        }
        if (data.refreshToken) {
          localStorage.setItem(`${window.appId}_refreshToken`, data.refreshToken);
        }
        vtoast.success('登陆成功');
        setTimeout(() => {
          location.href = `/${window.appId}`;
        }, 700);
      } catch (e) {
        vtoast.fail(e.errorReason || e.message);
      }
    },
  }
})
</script>

{% endblock %}
