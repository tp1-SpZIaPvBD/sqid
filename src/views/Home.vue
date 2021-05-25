<template>
  <sqid-bars>
    <template v-slot:mainbar>
	    <h1 v-t="'home.home'" />
      <i18n tag="p" path="home.description">
      </i18n>
      <i18n tag="p" path="home.description2">
      </i18n>

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
