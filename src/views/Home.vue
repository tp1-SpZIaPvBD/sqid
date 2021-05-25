<template>
  <sqid-bars>
    <template v-slot:mainbar>
	    <h1 v-t="'home.home'" />
      <i18n tag="p" path="home.description">
      </i18n>
      <i18n tag="p" path="home.description2">
      </i18n>

     <p>{{ $t('home.examples') }}
        <ul>
		      <li>Linux - returns vulnerabilities which affect Linux distros (e.g. <a href="http://147.175.121.153/entity/https:%2F%2Fcve.mitre.org%2Fcgi-bin%2Fcvename.cgi%3Fname=CVE-2002-0018">CVE-2002-0018</a>)</li>
          <li>Windows - returns vulnerabilities which affect various Windows operating systems (e.g. <a href="http://147.175.121.153/entity/https:%2F%2Fcve.mitre.org%2Fcgi-bin%2Fcvename.cgi%3Fname=CVE-2005-0204">CVE-2005-0204</a>)</li>
          <li>IBM - returns vulnerabilities which affect operating systems developed by IBM (e.g. <a href="http://147.175.121.153/entity/https:%2F%2Fcve.mitre.org%2Fcgi-bin%2Fcvename.cgi%3Fname=CVE-2011-1385">CVE-2011-1385</a>)</li>
          <li>Solaris - returns vulnerabilities which affect various Solaris operating systems (e.g. <a href="http://147.175.121.153/entity/https:%2F%2Fcve.mitre.org%2Fcgi-bin%2Fcvename.cgi%3Fname=CVE-2002-0085">CVE-2002-0085</a>)</li>
        </ul>
      </p>

      <!-- TODO -->
      <!-- <p>{{ $t('home.examples') }}
        <ul>
		      <i18n tag="li" path="home.examplesLinux"><entity-link place="linux" entityId="#" /></i18n>
          <i18n tag="li" path="home.exampWindows"><entity-link place="windows" entityId="#" /></i18n>
          <i18n tag="li" path="home.examplesIBM"><entity-link place="ibm" entityId="#" /></i18n>
          <i18n tag="li" path="home.examplesSolaris"><entity-link place="solaris" entityId="#" /></i18n>
        </ul>
      </p> -->

    </template>
    <template v-slot:sidebar>
      <sqid-image :file="'Cephalop.jpg'" :width="260" />
    </template>
  </sqid-bars>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { Action } from 'vuex-class'
import { i18n } from '@/i18n'

@Component
export default class Home extends Vue {
  @Action private requestLabels: any

  private get language() {
    return i18n.locale
  }

  @Watch('language')
  private updateLanguage() {
    this.requestLabels({
      entityIds: ['Q1339', 'Q8072', 'Q318', 'P21', 'P1303', 'Q18616576', 'P31', 'P279'],
      lang: this.language,
    })
  }

  private created() {
    this.updateLanguage()
  }
}
</script>
