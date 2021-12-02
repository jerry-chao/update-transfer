<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title><$ ctx.app.config.appTitle $></title>
  <meta charset="utf-8" name="viewport"
        content="width=device-width, initial-scale=1.0, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0"/>
  <link href="/<$ ctx.app.config.appId $>/public/css/global.css" rel="stylesheet">
  <link href="/<$ ctx.app.config.appId $>/public/css/materialdesignicons.min.css" rel="stylesheet">
  <link href="/<$ ctx.app.config.appId $>/public/css/vuetify.min.css" rel="stylesheet">

  <script type="text/javascript">
    window.appId = "<$ ctx.app.config.appId $>";
    window.appInfo = {
      appId: "<$ ctx.app.config.appId $>",
      userAgent: navigator.userAgent || '',
    }
    if (window.appInfo.userAgent.length > 127) {
      window.appInfo.userAgent = window.appInfo.userAgent.substring(0, 126);
    }
  </script>
  <script src="/<$ ctx.app.config.appId $>/public/js/lib/fp.min.js"></script>
  <script src="/<$ ctx.app.config.appId $>/public/js/lib/lodash.min.js"></script>
  <script src="/<$ ctx.app.config.appId $>/public/js/lib/dayjs.min.js"></script>
  <script src="/<$ ctx.app.config.appId $>/public/js/lib/axios.min.js"></script>
  <script src="/<$ ctx.app.config.appId $>/public/js/protocol/protocol.js"></script>
  <script type="text/javascript">
    // 获取用户有权限的 page、ui level

  </script>



  {% block css %}{% endblock %}

</head>
<body>
<!-- 使用 x-template 的模式，避免 vue-slot 不能支持大写字母的问题 -->
<script type="text/x-template" id="app-template">
  <div id="container">
    {% block vue_template %}{% endblock %}
  </div>
</script>
<div id="app">
</div>

<script src="/<$ ctx.app.config.appId $>/public/js/lib/vue.js"></script>
<script src="/<$ ctx.app.config.appId $>/public/js//lib/vuetify.js"></script>
<script type="module">
  import VToast from '/<$ ctx.app.config.appId $>/public/js/components/vtoast.js';
  window.vtoast = VToast;
</script>
{% block vue_body %}{% endblock %}

</body>
