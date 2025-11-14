<template>
  <div class="filter-name">
    <button class="px-2 rounded border overflow-hidden text-ellipsis"
      :class="{ 'border-gray-500': showAsActive, 'border-gray-900': !showAsActive }"
      @click="toggleAccuracy">
      {{ label }}
      <span v-if="bisLabel" class="ml-2 px-2 py-0.5 rounded bg-emerald-700 text-xs inline-block align-middle">{{ bisLabel }}</span>
    </button>
    <button v-if="filters.corrupted" class="px-2" @click="corrupted = !corrupted">
      <span v-if="corrupted" class="text-red-500">{{ t('item.corrupted') }}</span>
      <span v-else class="text-gray-600">{{ t('item.not_corrupted') }}</span>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ParsedItem } from '@/parser'
import type { ItemFilters } from './interfaces'
import { CATEGORY_TO_TRADE_ID } from '../trade/pathofexile-trade'
import { isBisBase, getBisRankWithType } from '@/assets/data/bis'
import { AppConfig } from '@/web/Config'

export default defineComponent({
  name: 'FilterName',
  props: {
    filters: {
      type: Object as PropType<ItemFilters>,
      required: true
    },
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    }
  },
  setup (props) {
    const { t } = useI18n()

    const label = computed(() => {
      const { filters } = props
      const activeSearch = (filters.searchRelaxed && !filters.searchRelaxed.disabled)
        ? filters.searchRelaxed
        : filters.searchExact

      if (activeSearch.name) {
        return activeSearch.name
      }
      if (activeSearch.baseType) {
        return activeSearch.baseType
      }
      if (activeSearch.category) {
        const tradeId = CATEGORY_TO_TRADE_ID.get(activeSearch.category)!
        return t('item_category.prop', [t(`item_category.${tradeId.replace('.', '_')}`)])
      }

      return '??? Report if you see this text'
    })

    const showAsActive = computed(() => {
      const { filters } = props
      return filters.searchRelaxed?.disabled
    })

    function toggleAccuracy () {
      const { filters } = props
      if (filters.searchRelaxed) {
        filters.searchRelaxed.disabled = !filters.searchRelaxed.disabled
      }
    }

    const corrupted = computed<boolean>({
      get () { return props.filters.corrupted!.value },
      set (value) { props.filters.corrupted!.value = value }
    })

    const bisLabel = computed(() => {
      const cat = props.item.category as unknown as string | undefined
      const ref = props.item.info.refName
      if (!isBisBase(props.item.info.namespace, cat, ref)) return ''
      const priceCheck = AppConfig().widgets.find(w => w.wmType === 'price-check') as any
      if (!priceCheck?.showBisBadge) return ''
      const res = getBisRankWithType(cat, ref)
      if (res) {
        const typeKey = `item.defence_type_${res.type}`
        const typeLabel = t(typeKey)
        if (priceCheck.showBisType) {
          return t('item.bis_rank_pill_with_type', [String(res.rank), typeLabel])
        } else {
          return t('item.bis_rank_pill', [String(res.rank)])
        }
      }
      return t('item.best_in_slot_base')
    })

    return {
      t,
      label,
      showAsActive,
      toggleAccuracy,
      corrupted,
      bisLabel
    }
  }
})
</script>

<style lang="postcss">
.filter-name {
  @apply bg-gray-900 mb-2 rounded;
  line-height: 1.25rem;
  display: flex;
  justify-content: space-between;
  white-space: nowrap;
}
</style>
